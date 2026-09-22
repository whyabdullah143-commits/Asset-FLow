import { Router, Request, Response } from 'express';
import { db } from './db.js';
import {
  authenticateUser,
  requireAdmin,
  generateToken,
  hashPassword,
  verifyPassword,
  AuthenticatedRequest,
} from './auth.js';
import {
  User,
  InvestmentPlan,
  UserPlan,
  PaymentMethod,
  DepositRequest,
  WithdrawalRequest,
  PromoCode,
  TeamMilestone,
  SalaryTier,
  SalaryPayout,
} from '../src/types.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, username, email, password, referralCode } = req.body;

    if (!name || !username || !email || !password) {
      res.status(400).json({ error: 'Please provide full name, username, email, and password.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const data = db.getRawData();
    const existingUser = data.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
    );

    if (existingUser) {
      res.status(400).json({ error: 'A user with this email or username already exists.' });
      return;
    }

    // Verify referral code if provided
    let referrer: User | undefined;
    if (referralCode && referralCode.trim()) {
      referrer = data.users.find(
        (u) => u.referralCode.toUpperCase() === referralCode.trim().toUpperCase()
      );
    }

    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReferralCode = `AF-${cleanUsername.toUpperCase().substring(0, 8)}${Math.floor(100 + Math.random() * 900)}`;

    const newUser: User & { passwordHash: string } = {
      id: newUserId,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role: 'user',
      status: 'active',
      referralCode: newReferralCode,
      referredBy: referrer ? referrer.referralCode : undefined,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
    };

    data.users.push(newUser);

    // Initialize balance
    db.getUserBalance(newUserId);

    // Add welcome notification
    db.addNotification(
      newUserId,
      'Welcome to AssetFlow!',
      'Your account is successfully registered. Explore investment plans or fund your wallet to begin earning daily ROI.',
      'system'
    );

    // Notify admin
    db.addNotification(
      'admin',
      'New User Registered',
      `${newUser.name} (@${newUser.username}) just created an account.`,
      'system'
    );

    const token = generateToken(newUser);
    const balance = db.getUserBalance(newUserId);

    const { passwordHash, ...safeUser } = newUser;
    res.json({
      message: 'Account registered successfully.',
      token,
      user: safeUser,
      balance,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter your email/username and password.' });
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const data = db.getRawData();
    const user = data.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. User not found.' });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      return;
    }

    if (user.status === 'blocked') {
      res.status(403).json({ error: 'Your account has been suspended by administration.' });
      return;
    }

    user.lastLogin = new Date().toISOString();
    db.persist();

    const token = generateToken(user);
    const balance = db.getUserBalance(user.id);

    const { passwordHash, ...safeUser } = user;
    res.json({
      message: 'Login successful.',
      token,
      user: safeUser,
      balance,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Demo login has been disabled
apiRouter.post('/auth/quick-login', (req: Request, res: Response) => {
  res.status(403).json({ error: 'Demo login is disabled. Please create or sign in with your account credentials.' });
});

apiRouter.get('/auth/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const balance = db.getUserBalance(req.user.id);
  res.json({ user: req.user, balance });
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  res.json({
    message: `If an account exists for ${email}, a password reset verification link has been sent to your inbox.`,
  });
});

// ==========================================
// 2. USER DASHBOARD & STATS
// ==========================================

apiRouter.get('/user/dashboard', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const balance = db.getUserBalance(user.id);

  const activePlans = data.userPlans.filter(
    (up) => up.userId === user.id && up.status === 'active'
  );
  const userTransactions = data.transactions.filter((t) => t.userId === user.id).slice(0, 8);
  const teamMembers = data.users.filter((u) => u.referredBy === user.referralCode);
  const unreadNotifs = data.notifications.filter(
    (n) => (n.userId === user.id || n.userId === 'all') && !n.read
  ).length;

  // 24-hour cycle estimate
  const totalDailyReturn = activePlans.reduce((sum, p) => sum + p.dailyIncome, 0);

  res.json({
    balance,
    activePlansCount: activePlans.length,
    activePlans,
    teamMembersCount: teamMembers.length,
    activeTeamMembers: teamMembers.filter((m) => m.status === 'active').length,
    totalDailyReturn,
    recentTransactions: userTransactions,
    unreadNotifications: unreadNotifs,
  });
});

// ==========================================
// 3. INVESTMENT PLANS
// ==========================================

apiRouter.get('/plans', (req: Request, res: Response) => {
  const data = db.getRawData();
  const activePlans = data.plans
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.order - b.order);
  res.json({ plans: activePlans });
});

apiRouter.get('/user/plans', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const cycleHours = data.settings?.dailyEarningCycleHours || 24;
  const cycleMs = cycleHours * 60 * 60 * 1000;
  const now = Date.now();

  let hasUpdates = false;

  const userPlans = data.userPlans
    .filter((up) => up.userId === user.id)
    .map((up) => {
      // Check if plan validity expired
      if (up.status === 'active' && up.expiryDate) {
        if (now >= new Date(up.expiryDate).getTime()) {
          up.status = 'completed';
          hasUpdates = true;
        }
      }

      const lastRefTime = new Date(up.lastClaimDate || up.startDate).getTime();
      const nextClaimTimestamp = lastRefTime + cycleMs;
      const remainingMs = Math.max(0, nextClaimTimestamp - now);
      const canClaim = up.status === 'active' && remainingMs === 0;

      return {
        ...up,
        nextClaimTime: new Date(nextClaimTimestamp).toISOString(),
        canClaim,
        remainingSeconds: Math.floor(remainingMs / 1000),
      };
    });

  if (hasUpdates) {
    db.persist();
  }

  res.json({
    userPlans,
    serverTime: new Date().toISOString(),
    cycleHours,
  });
});

apiRouter.post('/plans/activate', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { planId } = req.body;

    const data = db.getRawData();
    const plan = data.plans.find((p) => p.id === planId && p.status === 'active');

    if (!plan) {
      res.status(404).json({ error: 'Investment plan not found or currently unavailable.' });
      return;
    }

    const balance = db.getUserBalance(user.id);
    if (balance.totalBalance < plan.price) {
      res.status(400).json({
        error: `Insufficient account balance. Required: $${plan.price.toFixed(2)}, Available: $${balance.totalBalance.toFixed(2)}. Please deposit funds first.`,
      });
      return;
    }

    // Atomic balance update
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance - plan.price).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal - plan.price).toFixed(2));
      bal.totalDeposits = Number((bal.totalDeposits + plan.price).toFixed(2));
    });

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.validityDays);

    const newUserPlan: UserPlan = {
      id: `up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      investedAmount: plan.price,
      dailyIncome: plan.dailyIncome,
      totalEarned: 0,
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      lastClaimDate: now.toISOString(),
      status: 'active',
    };

    data.userPlans.push(newUserPlan);

    // Create auditable transaction
    const newBal = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'plan_activation',
      amount: plan.price,
      isCredit: false,
      balanceAfter: newBal.totalBalance,
      status: 'completed',
      description: `Activated ${plan.name} ($${plan.price})`,
      referenceId: newUserPlan.id,
    });

    // Referral commission logic
    if (user.referredBy) {
      const referrer = data.users.find((u) => u.referralCode === user.referredBy);
      if (referrer) {
        const commissionPct = data.settings.referralCommissionPercent || 6.0;
        const commissionAmount = Number(((plan.price * commissionPct) / 100).toFixed(2));

        if (commissionAmount > 0) {
          db.updateUserBalance(referrer.id, (rBal) => {
            rBal.totalBalance = Number((rBal.totalBalance + commissionAmount).toFixed(2));
            rBal.availableWithdrawal = Number((rBal.availableWithdrawal + commissionAmount).toFixed(2));
            rBal.referralCommission = Number((rBal.referralCommission + commissionAmount).toFixed(2));
          });

          const rBal = db.getUserBalance(referrer.id);
          db.addTransaction({
            userId: referrer.id,
            userName: referrer.name,
            type: 'referral_commission',
            amount: commissionAmount,
            isCredit: true,
            balanceAfter: rBal.totalBalance,
            status: 'completed',
            description: `Referral commission (${commissionPct}%) from ${user.name} for ${plan.name}`,
            referenceId: newUserPlan.id,
          });

          db.addNotification(
            referrer.id,
            'Referral Commission Earned',
            `You received $${commissionAmount.toFixed(2)} (${commissionPct}%) because ${user.name} activated ${plan.name}!`,
            'referral'
          );
        }
      }
    }

    db.addNotification(
      user.id,
      'Plan Activated Successfully',
      `Your ${plan.name} has been activated. You will receive $${plan.dailyIncome.toFixed(2)} daily return.`,
      'plan'
    );

    db.persist();

    res.json({
      message: `${plan.name} activated successfully!`,
      userPlan: newUserPlan,
      balance: newBal,
    });
  } catch (err: any) {
    console.error('Plan activation error:', err);
    res.status(500).json({ error: 'Failed to activate plan.' });
  }
});

// Claim daily earnings for a specific active plan
apiRouter.post('/plans/:id/claim', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const planId = req.params.id;
    const data = db.getRawData();

    const userPlan = data.userPlans.find(
      (up) => up.id === planId && up.userId === user.id
    );

    if (!userPlan) {
      res.status(404).json({ error: 'Investment plan not found or not owned by you.' });
      return;
    }

    if (userPlan.status !== 'active') {
      res.status(400).json({ error: `This plan is ${userPlan.status} and cannot generate further returns.` });
      return;
    }

    const now = Date.now();
    // Check if plan has passed its expiry date
    if (userPlan.expiryDate && now >= new Date(userPlan.expiryDate).getTime()) {
      userPlan.status = 'completed';
      db.persist();
      res.status(400).json({ error: 'This investment plan has completed its full contractual term.' });
      return;
    }

    const cycleHours = data.settings?.dailyEarningCycleHours || 24;
    const cycleMs = cycleHours * 60 * 60 * 1000;
    const lastRefTime = new Date(userPlan.lastClaimDate || userPlan.startDate).getTime();
    const nextClaimTimestamp = lastRefTime + cycleMs;

    // Strict 24-hour enforcement: NO early claiming
    if (now < nextClaimTimestamp) {
      const remainingMs = nextClaimTimestamp - now;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSecs = Math.floor((remainingMs % (1000 * 60)) / 1000);

      res.status(400).json({
        error: `24-hour earning cycle is not complete yet. Time remaining: ${remainingHours}h ${remainingMins}m ${remainingSecs}s. You cannot claim early.`,
        canClaim: false,
        remainingSeconds: Math.floor(remainingMs / 1000),
        nextClaimTime: new Date(nextClaimTimestamp).toISOString(),
      });
      return;
    }

    const income = userPlan.dailyIncome;
    if (income <= 0) {
      res.status(400).json({ error: 'Daily return amount must be greater than zero.' });
      return;
    }

    // Update plan stats
    userPlan.totalEarned = Number((userPlan.totalEarned + income).toFixed(2));
    userPlan.lastClaimDate = new Date(now).toISOString();

    // Check if this claim completes the plan term
    if (userPlan.expiryDate && now >= new Date(userPlan.expiryDate).getTime()) {
      userPlan.status = 'completed';
    }

    // Update user balance atomically
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance + income).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + income).toFixed(2));
      bal.todayEarnings = Number((bal.todayEarnings + income).toFixed(2));
      bal.totalEarnings = Number((bal.totalEarnings + income).toFixed(2));
    });

    const bal = db.getUserBalance(user.id);

    // Ledger transaction
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'daily_earning',
      amount: income,
      isCredit: true,
      balanceAfter: bal.totalBalance,
      status: 'completed',
      description: `Claimed daily return: ${userPlan.planName} (+$${income.toFixed(2)})`,
      referenceId: userPlan.id,
    });

    // In-app notification
    db.addNotification(
      user.id,
      'Daily ROI Claimed',
      `+$${income.toFixed(2)} credited to your available balance for ${userPlan.planName}. Next claim in 24 hours.`,
      'earning'
    );

    db.persist();

    const newNextClaimTimestamp = now + cycleMs;

    res.json({
      message: `Successfully claimed +$${income.toFixed(2)} daily return for ${userPlan.planName}!`,
      claimedAmount: income,
      userPlan: {
        ...userPlan,
        nextClaimTime: new Date(newNextClaimTimestamp).toISOString(),
        canClaim: false,
        remainingSeconds: Math.floor(cycleMs / 1000),
      },
      balance: bal,
    });
  } catch (err: any) {
    console.error('Single plan claim error:', err);
    res.status(500).json({ error: 'Failed to claim daily plan earnings.' });
  }
});

// Also support POST /plans/claim-plan with body { userPlanId }
apiRouter.post('/plans/claim-plan', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const { userPlanId } = req.body;
  if (!userPlanId) {
    res.status(400).json({ error: 'userPlanId is required.' });
    return;
  }
  req.params.id = userPlanId;
  // Re-route to handler
  const handler = (apiRouter as any).stack.find(
    (layer: any) => layer.route && layer.route.path === '/plans/:id/claim' && layer.route.methods.post
  );
  if (handler) {
    return handler.route.stack[handler.route.stack.length - 1].handle(req, res);
  }
  res.status(500).json({ error: 'Handler not found.' });
});

// Claim all eligible active plans whose 24-hour cycle is completed
apiRouter.post('/plans/claim-daily', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = db.getRawData();
    const cycleHours = data.settings?.dailyEarningCycleHours || 24;
    const cycleMs = cycleHours * 60 * 60 * 1000;
    const now = Date.now();

    const activePlans = data.userPlans.filter(
      (up) => up.userId === user.id && up.status === 'active'
    );

    if (activePlans.length === 0) {
      res.status(400).json({ error: 'You do not have any active investment plans.' });
      return;
    }

    // Filter only plans whose 24-hour countdown has fully completed
    const readyPlans = activePlans.filter((p) => {
      const lastRefTime = new Date(p.lastClaimDate || p.startDate).getTime();
      return now >= lastRefTime + cycleMs;
    });

    if (readyPlans.length === 0) {
      // Find the soonest plan to unlock to give user precise remaining time
      let minRemainingMs = cycleMs;
      activePlans.forEach((p) => {
        const lastRefTime = new Date(p.lastClaimDate || p.startDate).getTime();
        const rem = (lastRefTime + cycleMs) - now;
        if (rem > 0 && rem < minRemainingMs) {
          minRemainingMs = rem;
        }
      });

      const remainingHours = Math.floor(minRemainingMs / (1000 * 60 * 60));
      const remainingMins = Math.floor((minRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSecs = Math.floor((minRemainingMs % (1000 * 60)) / 1000);

      res.status(400).json({
        error: `None of your plans have reached their 24-hour completion yet. Next unlock in ${remainingHours}h ${remainingMins}m ${remainingSecs}s. You cannot claim early.`,
      });
      return;
    }

    const totalIncome = readyPlans.reduce((sum, p) => sum + p.dailyIncome, 0);

    // Update plans' lastClaimDate and totalEarned
    readyPlans.forEach((p) => {
      p.totalEarned = Number((p.totalEarned + p.dailyIncome).toFixed(2));
      p.lastClaimDate = new Date(now).toISOString();
      if (p.expiryDate && now >= new Date(p.expiryDate).getTime()) {
        p.status = 'completed';
      }
    });

    // Update user balance atomically
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance + totalIncome).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + totalIncome).toFixed(2));
      bal.todayEarnings = Number((bal.todayEarnings + totalIncome).toFixed(2));
      bal.totalEarnings = Number((bal.totalEarnings + totalIncome).toFixed(2));
    });

    const bal = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'daily_earning',
      amount: totalIncome,
      isCredit: true,
      balanceAfter: bal.totalBalance,
      status: 'completed',
      description: `Claimed daily yield for ${readyPlans.length} active plan(s) (+$${totalIncome.toFixed(2)})`,
    });

    db.addNotification(
      user.id,
      'Daily ROI Claimed',
      `+$${totalIncome.toFixed(2)} credited to your available balance for ${readyPlans.length} completed 24-hour cycle(s).`,
      'earning'
    );

    db.persist();

    res.json({
      message: `Successfully claimed $${totalIncome.toFixed(2)} daily return for ${readyPlans.length} plan(s)!`,
      claimedAmount: totalIncome,
      claimedCount: readyPlans.length,
      balance: bal,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to claim daily earnings.' });
  }
});

// ==========================================
// 4. DEPOSIT SYSTEM
// ==========================================

apiRouter.get('/deposits/methods', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const data = db.getRawData();
  const methods = data.paymentMethods
    .filter((m) => m.isActive !== false && m.status !== 'inactive')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  res.json({
    methods,
    usdToPkrRate: data.settings?.usdToPkrRate || 280.0,
    serverTime: new Date().toISOString(),
  });
});

apiRouter.get('/deposits/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const userDeposits = data.deposits.filter((d) => d.userId === user.id);
  res.json({ deposits: userDeposits });
});

apiRouter.post('/deposits', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { methodId, amount, transactionRef, proofUrl, notes, pkrAmount, exchangeRate } = req.body;

    const depositAmount = parseFloat(amount);
    if (!methodId || isNaN(depositAmount) || depositAmount <= 0) {
      res.status(400).json({ error: 'Please enter a valid deposit amount and choose a payment method.' });
      return;
    }

    if (!transactionRef || !transactionRef.trim()) {
      res.status(400).json({ error: 'Transaction Reference ID (TID / TXID) is required.' });
      return;
    }

    const data = db.getRawData();
    const method = data.paymentMethods.find((m) => m.id === methodId && m.status === 'active');

    if (!method) {
      res.status(404).json({ error: 'Selected payment method is unavailable.' });
      return;
    }

    const minAllowed = data.settings.minDeposit ?? method.minDeposit ?? 10;
    const maxAllowed = data.settings.maxDeposit ?? method.maxDeposit ?? 5000;

    if (depositAmount < minAllowed) {
      res.status(400).json({
        error: `Minimum deposit allowed is $${minAllowed.toFixed(2)}.`,
      });
      return;
    }

    if (depositAmount > maxAllowed) {
      res.status(400).json({
        error: `Maximum deposit allowed per transaction is $${maxAllowed.toFixed(2)}.`,
      });
      return;
    }

    // Check duplicate transactionRef
    const duplicate = data.deposits.find(
      (d) => d.transactionRef.toLowerCase() === transactionRef.trim().toLowerCase()
    );
    if (duplicate) {
      res.status(400).json({
        error: 'This Transaction Reference ID has already been submitted. Please check your records.',
      });
      return;
    }

    const fee = Number(((depositAmount * method.feePercent) / 100).toFixed(2));
    const netAmount = Number((depositAmount - fee).toFixed(2));

    const currentRate = exchangeRate ? parseFloat(exchangeRate) : data.settings.usdToPkrRate || 280.0;
    const finalPkr = pkrAmount ? parseFloat(pkrAmount) : Number((depositAmount * currentRate).toFixed(0));

    const newDeposit: DepositRequest = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      methodId: method.id,
      methodName: method.name,
      amount: depositAmount,
      pkrAmount: finalPkr,
      exchangeRate: currentRate,
      fee,
      netAmount,
      transactionRef: transactionRef.trim(),
      proofUrl,
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    data.deposits.unshift(newDeposit);

    // Create pending transaction in ledger
    const balance = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'deposit',
      amount: depositAmount,
      isCredit: true,
      balanceAfter: balance.totalBalance,
      status: 'pending',
      description: `Deposit via ${method.name} (TID: ${transactionRef})`,
      referenceId: newDeposit.id,
    });

    db.addNotification(
      user.id,
      'Deposit Request Submitted',
      `Your deposit of $${depositAmount.toFixed(2)} via ${method.name} has been submitted for admin verification.`,
      'deposit'
    );

    // Notify admin
    db.addNotification(
      'admin',
      'Pending Deposit Submitted',
      `${user.name} submitted a $${depositAmount.toFixed(2)} deposit via ${method.name}.`,
      'deposit'
    );

    db.persist();

    res.json({
      message: 'Deposit request submitted successfully! Awaiting verification.',
      deposit: newDeposit,
    });
  } catch (err: any) {
    console.error('Deposit submission error:', err);
    res.status(500).json({ error: 'Failed to submit deposit request.' });
  }
});

// ==========================================
// 5. WITHDRAWAL SYSTEM
// ==========================================

apiRouter.get('/withdrawals/config', (req: Request, res: Response) => {
  const data = db.getRawData();
  res.json({
    minWithdrawal: data.settings.minWithdrawal,
    maxWithdrawal: data.settings.maxWithdrawal,
    withdrawalFeePercent: data.settings.withdrawalFeePercent,
  });
});

apiRouter.get('/withdrawals/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const userWithdrawals = data.withdrawals.filter((w) => w.userId === user.id);
  res.json({ withdrawals: userWithdrawals });
});

// Helper to verify if withdrawal window is open based on admin schedule
function checkWithdrawalWindow(settings: any): { allowed: boolean; message?: string } {
  if (!settings.withdrawalTimingEnabled) {
    return { allowed: true };
  }

  const offsetHours = typeof settings.withdrawalTimezoneOffset === 'number' ? settings.withdrawalTimezoneOffset : 5; // default PKT UTC+5
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const targetDate = new Date(utc + (3600000 * offsetHours));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[targetDate.getDay()];

  const allowedDays: string[] = Array.isArray(settings.withdrawalAllowedDays) && settings.withdrawalAllowedDays.length > 0
    ? settings.withdrawalAllowedDays
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!allowedDays.includes(currentDay)) {
    return {
      allowed: false,
      message: settings.withdrawalClosedMessage || `Withdrawals are closed today (${currentDay}). Allowed days: ${allowedDays.join(', ')}.`,
    };
  }

  const start = settings.withdrawalStartTime || '09:00';
  const end = settings.withdrawalEndTime || '18:00';

  const [startH, startM] = (start || '09:00').split(':').map((v: string) => parseInt(v, 10) || 0);
  const [endH, endM] = (end || '18:00').split(':').map((v: string) => parseInt(v, 10) || 0);

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let isOpen = false;
  if (startMinutes <= endMinutes) {
    isOpen = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // overnight window
    isOpen = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  if (!isOpen) {
    const timeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
    return {
      allowed: false,
      message: settings.withdrawalClosedMessage || `Withdrawals are only open between ${start} and ${end} (PKT / UTC+${offsetHours}). Current time is ${timeStr}.`,
    };
  }

  return { allowed: true };
}

apiRouter.post('/withdrawals', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { methodName, accountDetails, accountTitle, accountNumber, amount } = req.body;
    const finalDetails = accountDetails || (accountTitle && accountNumber ? `${accountTitle} (${accountNumber})` : accountTitle || accountNumber || '');

    const withdrawAmount = parseFloat(amount);
    if (!methodName || !finalDetails || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      res.status(400).json({ error: 'Please provide valid withdrawal method, account details, and amount.' });
      return;
    }

    const data = db.getRawData();

    // Check withdrawal timing restrictions set by Admin
    const timingCheck = checkWithdrawalWindow(data.settings);
    if (!timingCheck.allowed) {
      res.status(400).json({ error: timingCheck.message });
      return;
    }

    // Check if withdrawal amount must match configured button boxes
    const allowedBoxes = data.settings.withdrawalBoxes;
    if (Array.isArray(allowedBoxes) && allowedBoxes.length > 0) {
      const isAllowedBox = allowedBoxes.some(
        (boxVal) => Math.abs(Number(boxVal) - withdrawAmount) < 0.001
      );
      if (!isAllowedBox) {
        res.status(400).json({
          error: `Please select one of the allowed payout box options (${allowedBoxes.map((b) => `$${b}`).join(', ')}). Manual amounts are not allowed.`,
        });
        return;
      }
    }

    const balance = db.getUserBalance(user.id);

    if (withdrawAmount < data.settings.minWithdrawal) {
      res.status(400).json({
        error: `Minimum withdrawal is $${data.settings.minWithdrawal.toFixed(2)}.`,
      });
      return;
    }

    if (withdrawAmount > data.settings.maxWithdrawal) {
      res.status(400).json({
        error: `Maximum withdrawal per transaction is $${data.settings.maxWithdrawal.toFixed(2)}.`,
      });
      return;
    }

    if (balance.availableWithdrawal < withdrawAmount) {
      res.status(400).json({
        error: `Insufficient available withdrawal balance. You have $${balance.availableWithdrawal.toFixed(2)} available.`,
      });
      return;
    }

    const fee = 0; // Strictly zero withdrawal fee per user requirements
    const netAmount = withdrawAmount;

    // Deduct immediately to prevent double spending
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance - withdrawAmount).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal - withdrawAmount).toFixed(2));
    });

    const newWithdrawal: WithdrawalRequest = {
      id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      methodName,
      accountDetails: finalDetails,
      accountTitle: accountTitle || user.name,
      accountNumber: accountNumber || '',
      amount: withdrawAmount,
      fee,
      netAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    data.withdrawals.unshift(newWithdrawal);

    const updatedBal = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'withdrawal',
      amount: withdrawAmount,
      isCredit: false,
      balanceAfter: updatedBal.totalBalance,
      status: 'pending',
      description: `Withdrawal request to ${methodName} (${accountDetails})`,
      referenceId: newWithdrawal.id,
    });

    db.addNotification(
      user.id,
      'Withdrawal Request Received',
      `Your request to withdraw $${withdrawAmount.toFixed(2)} (Net: $${netAmount.toFixed(2)}) is pending review.`,
      'withdrawal'
    );

    // Notify admin
    db.addNotification(
      'admin',
      'New Withdrawal Pending',
      `${user.name} requested a $${withdrawAmount.toFixed(2)} payout to ${methodName}.`,
      'withdrawal'
    );

    db.persist();

    res.json({
      message: 'Withdrawal request submitted successfully! It will be reviewed by admin.',
      withdrawal: newWithdrawal,
      balance: updatedBal,
    });
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Failed to process withdrawal request.' });
  }
});

// ==========================================
// 6. TRANSACTIONS
// ==========================================

apiRouter.get('/transactions/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const { type, status, search } = req.query;

  let txs = data.transactions.filter((t) => t.userId === user.id);

  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }

  if (status && status !== 'all') {
    txs = txs.filter((t) => t.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    txs = txs.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.referenceId && t.referenceId.toLowerCase().includes(q))
    );
  }

  res.json({ transactions: txs });
});

// ==========================================
// 7. REFERRALS & TEAM MILESTONES
// ==========================================

apiRouter.get('/referrals/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const balance = db.getUserBalance(user.id);

  const team = data.users.filter((u) => u.referredBy === user.referralCode);

  const teamList = team.map((member) => {
    const activePlan = data.userPlans.find(
      (p) => p.userId === member.id && p.status === 'active'
    );
    const totalDep = data.deposits
      .filter((d) => d.userId === member.id && d.status === 'approved')
      .reduce((s, d) => s + d.amount, 0);

    return {
      id: member.id,
      name: member.name,
      username: member.username,
      email: member.email,
      joinedAt: member.createdAt,
      activePlan: activePlan ? activePlan.planName : null,
      totalDeposit: totalDep,
      status: member.status,
      level: 1,
    };
  });

  res.json({
    referralCode: user.referralCode,
    commissionPercent: data.settings.referralCommissionPercent,
    totalCommission: balance.referralCommission,
    totalMembers: teamList.length,
    activeMembers: teamList.filter((m) => m.activePlan !== null || m.totalDeposit > 0).length,
    members: teamList,
  });
});

apiRouter.get('/milestones', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();

  const team = data.users.filter((u) => u.referredBy === user.referralCode);
  const activeMembersCount = team.filter((m) => {
    const hasActivePlan = data.userPlans.some(
      (p) => p.userId === m.id && p.status === 'active'
    );
    return hasActivePlan;
  }).length;

  const totalRegisteredCount = team.length;

  const userClaims = data.teamMilestoneClaims.filter((c) => c.userId === user.id);

  const milestonesWithStatus = data.teamMilestones
    .filter((m) => m.status === 'active')
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const currentCount = m.condition === 'active_plan' ? activeMembersCount : totalRegisteredCount;
      const isQualified = currentCount >= m.requiredMembers;
      const isClaimed = userClaims.some((c) => c.milestoneId === m.id);

      return {
        ...m,
        currentMembers: currentCount,
        isQualified,
        isClaimed,
      };
    });

  res.json({ milestones: milestonesWithStatus });
});

apiRouter.post('/milestones/claim', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { milestoneId } = req.body;

    const data = db.getRawData();
    const milestone = data.teamMilestones.find((m) => m.id === milestoneId && m.status === 'active');

    if (!milestone) {
      res.status(404).json({ error: 'Team milestone reward not found.' });
      return;
    }

    // Check if already claimed
    const alreadyClaimed = data.teamMilestoneClaims.find(
      (c) => c.userId === user.id && c.milestoneId === milestone.id
    );

    if (alreadyClaimed) {
      res.status(400).json({ error: 'You have already claimed this milestone reward.' });
      return;
    }

    // Verify qualification server-side
    const team = data.users.filter((u) => u.referredBy === user.referralCode);
    const qualifyingCount =
      milestone.condition === 'active_plan'
        ? team.filter((m) => data.userPlans.some((p) => p.userId === m.id && p.status === 'active')).length
        : team.length;

    if (qualifyingCount < milestone.requiredMembers) {
      res.status(400).json({
        error: `Not yet qualified. You have ${qualifyingCount}/${milestone.requiredMembers} required members.`,
      });
      return;
    }

    // Grant reward
    data.teamMilestoneClaims.push({
      id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      milestoneId: milestone.id,
      userId: user.id,
      rewardAmount: milestone.rewardAmount,
      claimedAt: new Date().toISOString(),
    });

    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance + milestone.rewardAmount).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + milestone.rewardAmount).toFixed(2));
      bal.teamRewards = Number((bal.teamRewards + milestone.rewardAmount).toFixed(2));
    });

    const bal = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'team_reward',
      amount: milestone.rewardAmount,
      isCredit: true,
      balanceAfter: bal.totalBalance,
      status: 'completed',
      description: `Claimed team milestone: ${milestone.title} ($${milestone.rewardAmount})`,
      referenceId: milestone.id,
    });

    db.addNotification(
      user.id,
      'Milestone Reward Claimed!',
      `You unlocked +$${milestone.rewardAmount.toFixed(2)} from ${milestone.title}.`,
      'earning'
    );

    db.persist();

    res.json({
      message: `Congratulations! Successfully claimed $${milestone.rewardAmount.toFixed(2)} milestone bonus!`,
      rewardAmount: milestone.rewardAmount,
      balance: bal,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to claim milestone reward.' });
  }
});

// ==========================================
// 7.1. WEEKLY SALARY SYSTEM
// ==========================================

apiRouter.get('/salary/status', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = db.getRawData();
    const team = data.users.filter((u) => u.referredBy === user.referralCode);
    const activeMembersCount = team.filter((m) =>
      data.userPlans.some((p) => p.userId === m.id && p.status === 'active')
    ).length;
    const totalMembersCount = team.length;

    const dbUser = data.users.find((u) => u.id === user.id);
    const storedPeak = dbUser?.peakTeamCount || (user as any).peakTeamCount || 0;
    const storedTierId = dbUser?.unlockedSalaryTierId || (user as any).unlockedSalaryTierId;

    const currentCount = Math.max(activeMembersCount, totalMembersCount);
    const peakCount = Math.max(storedPeak, currentCount);

    if (dbUser && peakCount > (dbUser.peakTeamCount || 0)) {
      dbUser.peakTeamCount = peakCount;
      db.persist();
    }

    const tiers = (data.salaryTiers || [])
      .filter((t) => t.status === 'active')
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.requiredMembers - b.requiredMembers);

    // User's past salary payouts
    const userPayouts = (data.salaryPayouts || [])
      .filter((p) => p.userId === user.id)
      .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());

    // Find highest qualifying tier based on peak/lifetime achieved members or stored unlocked tier
    let highestQualifiedTier: SalaryTier | null = null;
    let highestUnlockedOrder = -1;

    for (const tier of tiers) {
      const count = Math.max(
        tier.condition === 'active_plan' ? activeMembersCount : totalMembersCount,
        peakCount
      );
      const isQualified = count >= tier.requiredMembers || storedTierId === tier.id;
      if (isQualified && (tier.order || 0) >= highestUnlockedOrder) {
        highestQualifiedTier = tier;
        highestUnlockedOrder = tier.order || 0;
      }
    }

    // Permanently record the unlocked tier on user record so they NEVER lose it
    if (dbUser && highestQualifiedTier && dbUser.unlockedSalaryTierId !== highestQualifiedTier.id) {
      dbUser.unlockedSalaryTierId = highestQualifiedTier.id;
      db.persist();
    }

    // Weekly cooldown (7 days = 604,800,000 ms)
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastPayout = userPayouts[0];
    let canClaim = false;
    let nextClaimDate: string | null = null;
    let msRemaining = 0;

    if (highestQualifiedTier) {
      if (!lastPayout) {
        canClaim = true;
      } else {
        const lastClaimTime = new Date(lastPayout.claimedAt).getTime();
        const nextTime = lastClaimTime + WEEK_MS;
        const now = Date.now();
        if (now >= nextTime) {
          canClaim = true;
        } else {
          canClaim = false;
          nextClaimDate = new Date(nextTime).toISOString();
          msRemaining = Math.max(0, nextTime - now);
        }
      }
    }

    const remainingSeconds = Math.max(0, Math.floor(msRemaining / 1000));
    const daysLeft = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const totalSalaryEarned = userPayouts.reduce((sum, p) => sum + p.weeklySalary, 0);

    const mappedTiers = tiers.map((t) => {
      const count = Math.max(
        t.condition === 'active_plan' ? activeMembersCount : totalMembersCount,
        peakCount
      );
      const isUnlocked =
        count >= t.requiredMembers ||
        storedTierId === t.id ||
        (highestQualifiedTier ? (t.order || 0) <= (highestQualifiedTier.order || 0) : false);

      return {
        ...t,
        currentMembers: count,
        isQualified: !!isUnlocked,
        isPermanentlyUnlocked: !!isUnlocked,
      };
    });

    res.json({
      activeMembersCount: peakCount,
      activeCount: peakCount,
      totalMembersCount,
      registeredCount: totalMembersCount,
      peakTeamCount: peakCount,
      highestQualifiedTier,
      highestQualifyingTier: highestQualifiedTier,
      isPermanentlyUnlocked: !!highestQualifiedTier,
      canClaim,
      nextClaimDate,
      cooldownEndsAt: nextClaimDate,
      remainingSeconds,
      msRemaining,
      daysLeft,
      cycleDays: 7,
      totalSalaryEarned,
      tiers: mappedTiers,
      payouts: userPayouts,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch salary status.' });
  }
});

apiRouter.post('/salary/claim', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = db.getRawData();
    const team = data.users.filter((u) => u.referredBy === user.referralCode);
    const activeMembersCount = team.filter((m) =>
      data.userPlans.some((p) => p.userId === m.id && p.status === 'active')
    ).length;
    const totalMembersCount = team.length;

    const dbUser = data.users.find((u) => u.id === user.id);
    const storedPeak = dbUser?.peakTeamCount || (user as any).peakTeamCount || 0;
    const storedTierId = dbUser?.unlockedSalaryTierId || (user as any).unlockedSalaryTierId;

    const currentCount = Math.max(activeMembersCount, totalMembersCount);
    const peakCount = Math.max(storedPeak, currentCount);
    if (dbUser && peakCount > (dbUser.peakTeamCount || 0)) {
      dbUser.peakTeamCount = peakCount;
      db.persist();
    }

    const tiers = (data.salaryTiers || [])
      .filter((t) => t.status === 'active')
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.requiredMembers - b.requiredMembers);

    let qualifiedTier: SalaryTier | null = null;
    let highestUnlockedOrder = -1;

    for (const tier of tiers) {
      const count = Math.max(
        tier.condition === 'active_plan' ? activeMembersCount : totalMembersCount,
        peakCount
      );
      const isQualified = count >= tier.requiredMembers || storedTierId === tier.id;
      if (isQualified && (tier.order || 0) >= highestUnlockedOrder) {
        qualifiedTier = tier;
        highestUnlockedOrder = tier.order || 0;
      }
    }

    if (!qualifiedTier) {
      res.status(400).json({
        error: 'You have not unlocked any salary box yet. You need at least 10 members in your team to unlock weekly salary for life.',
      });
      return;
    }

    // Persist unlocked tier
    if (dbUser && dbUser.unlockedSalaryTierId !== qualifiedTier.id) {
      dbUser.unlockedSalaryTierId = qualifiedTier.id;
      db.persist();
    }

    const userPayouts = (data.salaryPayouts || [])
      .filter((p) => p.userId === user.id)
      .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastPayout = userPayouts[0];
    if (lastPayout) {
      const nextTime = new Date(lastPayout.claimedAt).getTime() + WEEK_MS;
      if (Date.now() < nextTime) {
        const remainingMs = nextTime - Date.now();
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        res.status(400).json({
          error: `7-day weekly salary cooldown is active. Next claim unlocks in ${days}d ${hours}h ${mins}m ${secs}s. Early claiming is restricted.`,
          canClaim: false,
          remainingSeconds: Math.floor(remainingMs / 1000),
          nextClaimDate: new Date(nextTime).toISOString(),
        });
        return;
      }
    }

    const now = new Date();
    const nextDate = new Date(now.getTime() + WEEK_MS);
    const newPayout: SalaryPayout = {
      id: `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      tierId: qualifiedTier.id,
      tierTitle: qualifiedTier.title,
      weeklySalary: qualifiedTier.weeklySalary,
      memberCount: qualifiedTier.condition === 'active_plan' ? activeMembersCount : totalMembersCount,
      claimedAt: now.toISOString(),
      nextClaimDate: nextDate.toISOString(),
      status: 'paid',
      transactionRef: `SAL-${Date.now().toString().slice(-6)}`,
    };

    if (!data.salaryPayouts) data.salaryPayouts = [];
    data.salaryPayouts.unshift(newPayout);

    // Credit to user balance
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance + qualifiedTier.weeklySalary).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + qualifiedTier.weeklySalary).toFixed(2));
      bal.teamRewards = Number((bal.teamRewards + qualifiedTier.weeklySalary).toFixed(2));
    });

    const updatedBalance = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'salary',
      amount: qualifiedTier.weeklySalary,
      isCredit: true,
      balanceAfter: updatedBalance.totalBalance,
      status: 'completed',
      description: `Weekly Salary Payout: ${qualifiedTier.title} ($${qualifiedTier.weeklySalary.toFixed(2)})`,
      referenceId: newPayout.id,
    });

    db.addNotification(
      user.id,
      'Weekly Salary Credited!',
      `Congratulations! Your weekly salary of $${qualifiedTier.weeklySalary.toFixed(2)} (${qualifiedTier.title}) has been paid directly to your balance.`,
      'earning'
    );

    db.addNotification(
      'admin',
      'Weekly Salary Claimed',
      `${user.name} claimed $${qualifiedTier.weeklySalary.toFixed(2)} weekly salary under ${qualifiedTier.title}.`,
      'system'
    );

    db.persist();

    res.json({
      message: `Congratulations! Successfully claimed $${qualifiedTier.weeklySalary.toFixed(2)} weekly salary!`,
      payout: newPayout,
      balance: updatedBalance,
      nextClaimDate: nextDate.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to claim weekly salary.' });
  }
});

// ==========================================
// 8. PROMO CODE SYSTEM
// ==========================================

const handlePromoRedeem = (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { code } = req.body;

    if (!code || !code.trim()) {
      res.status(400).json({ error: 'Please enter a valid promo code.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const data = db.getRawData();

    const promo = data.promoCodes.find(
      (p) => p.code.toUpperCase() === cleanCode && p.status === 'active'
    );

    if (!promo) {
      res.status(404).json({ error: 'Invalid or inactive promo code.' });
      return;
    }

    // Check expiry
    const now = new Date();
    if (promo.expiryDate && new Date(promo.expiryDate) < now) {
      res.status(400).json({ error: 'This promo code has expired.' });
      return;
    }

    // Check usage limits
    const promoMax = promo.usageLimit || promo.maxUses || 100;
    if (promo.usedCount >= promoMax) {
      promo.status = 'exhausted';
      db.persist();
      res.status(400).json({ error: 'This promo code has reached its maximum redemption limit.' });
      return;
    }

    // Check if user already redeemed
    const alreadyUsed = data.promoRedemptions.find(
      (r) => r.promoId === promo.id && r.userId === user.id
    );
    if (alreadyUsed) {
      res.status(400).json({ error: 'You have already redeemed this promo code.' });
      return;
    }

    // Process redemption
    promo.usedCount += 1;
    if (promo.usedCount >= promoMax) {
      promo.status = 'exhausted';
    }

    const redemption = {
      id: `pr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      promoId: promo.id,
      promoCode: promo.code,
      userId: user.id,
      userName: user.name,
      rewardAmount: promo.rewardAmount,
      redeemedAt: new Date().toISOString(),
    };
    data.promoRedemptions.push(redemption);

    // Update balance
    db.updateUserBalance(user.id, (bal) => {
      bal.totalBalance = Number((bal.totalBalance + promo.rewardAmount).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + promo.rewardAmount).toFixed(2));
      bal.promoRewards = Number((bal.promoRewards + promo.rewardAmount).toFixed(2));
    });

    const bal = db.getUserBalance(user.id);
    db.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'promo_reward',
      amount: promo.rewardAmount,
      isCredit: true,
      balanceAfter: bal.totalBalance,
      status: 'completed',
      description: `Redeemed promo code: ${promo.code}`,
      referenceId: promo.code,
    });

    db.addNotification(
      user.id,
      'Promo Code Applied!',
      `+$${promo.rewardAmount.toFixed(2)} bonus added to your balance for applying ${promo.code}.`,
      'promo'
    );

    db.persist();

    res.json({
      message: `Promo code ${promo.code} successfully applied! You received $${promo.rewardAmount.toFixed(2)}.`,
      rewardAmount: promo.rewardAmount,
      balance: bal,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to redeem promo code.' });
  }
};

apiRouter.post('/promo/apply', authenticateUser, handlePromoRedeem);
apiRouter.post('/promo/redeem', authenticateUser, handlePromoRedeem);

apiRouter.get('/promo/available', (req: Request, res: Response) => {
  // Promo codes are kept confidential and only managed via Admin.
  // Never expose active secret promo codes publicly to client endpoints.
  res.json({ promos: [], promoCodes: [] });
});

apiRouter.get('/promo/my', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const userRedemptions = data.promoRedemptions.filter((r) => r.userId === user.id);
  res.json({ redemptions: userRedemptions });
});

// ==========================================
// 9. SUPPORT TICKETS & HELP CENTER
// ==========================================

apiRouter.get('/support/tickets', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();
  const tickets = data.supportTickets.filter((t) => t.userId === user.id);
  res.json({ tickets });
});

apiRouter.post('/support/tickets', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, subject, priority = 'medium', message } = req.body;

    if (!subject || !message) {
      res.status(400).json({ error: 'Please enter a ticket subject and your inquiry message.' });
      return;
    }

    const data = db.getRawData();
    const ticketNo = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketNo,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      category: category || 'General Question',
      subject: subject.trim(),
      priority,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.supportTickets.unshift(newTicket);

    // Initial message
    data.supportMessages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId: newTicket.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: 'user',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    });

    db.addNotification(
      'admin',
      'New Support Ticket Opened',
      `[${ticketNo}] ${user.name}: ${subject}`,
      'support'
    );

    db.persist();

    res.json({
      message: 'Support ticket submitted successfully.',
      ticket: newTicket,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

apiRouter.get('/support/tickets/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const data = db.getRawData();

  const ticket = data.supportTickets.find((t) => t.id === id);
  if (!ticket) {
    res.status(404).json({ error: 'Support ticket not found.' });
    return;
  }

  // Allow ticket owner or admin
  if (ticket.userId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized access to this ticket.' });
    return;
  }

  const messages = data.supportMessages.filter((m) => m.ticketId === ticket.id);
  res.json({ ticket, messages });
});

apiRouter.post('/support/tickets/:id/reply', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const data = db.getRawData();
    const ticket = data.supportTickets.find((t) => t.id === id);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (ticket.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId: ticket.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    data.supportMessages.push(newMsg);

    // Update ticket status
    if (user.role === 'admin') {
      ticket.status = 'answered';
      db.addNotification(
        ticket.userId,
        `Support Replied to #${ticket.ticketNo}`,
        `An agent replied to your inquiry: "${ticket.subject}"`,
        'support'
      );
    } else {
      ticket.status = 'pending';
      db.addNotification(
        'admin',
        `User Replied to #${ticket.ticketNo}`,
        `${user.name} posted a new reply.`,
        'support'
      );
    }

    ticket.updatedAt = new Date().toISOString();
    db.persist();

    res.json({ message: 'Reply posted.', supportMessage: newMsg });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post reply.' });
  }
});

// ==========================================
// 10. NOTIFICATIONS
// ==========================================

apiRouter.get('/notifications', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getRawData();

  const userNotifs = data.notifications
    .filter((n) => n.userId === user.id || n.userId === 'all' || (user.role === 'admin' && n.userId === 'admin'))
    .slice(0, 50);

  res.json({ notifications: userNotifs });
});

apiRouter.post('/notifications/mark-read', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.body;
  const data = db.getRawData();

  if (id === 'all') {
    data.notifications
      .filter((n) => n.userId === user.id || n.userId === 'all' || (user.role === 'admin' && n.userId === 'admin'))
      .forEach((n) => (n.read = true));
  } else if (id) {
    const target = data.notifications.find((n) => n.id === id);
    if (target) target.read = true;
  }

  db.persist();
  res.json({ success: true });
});

// ==========================================
// 11. ADMIN PANEL APIS
// ==========================================

apiRouter.get('/admin/stats', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();

  const totalUsers = data.users.length;
  const activeUsers = data.users.filter((u) => u.status === 'active').length;
  const activePlansCount = data.userPlans.filter((p) => p.status === 'active').length;

  const pendingDeposits = data.deposits.filter((d) => d.status === 'pending');
  const approvedDeposits = data.deposits.filter((d) => d.status === 'approved');
  const approvedDepositsTotal = approvedDeposits.reduce((s, d) => s + d.amount, 0);

  const pendingWithdrawals = data.withdrawals.filter((w) => w.status === 'pending');
  const completedWithdrawals = data.withdrawals.filter((w) => w.status === 'completed');
  const completedWithdrawalsTotal = completedWithdrawals.reduce((s, w) => s + w.amount, 0);

  const totalEarningsDistributed = Object.values(data.balances).reduce(
    (s, b) => s + (b.totalEarnings || 0),
    0
  );
  const totalReferralCommission = Object.values(data.balances).reduce(
    (s, b) => s + (b.referralCommission || 0),
    0
  );
  const totalPromoRedemptions = data.promoRedemptions.length;
  const openSupportTickets = data.supportTickets.filter((t) => t.status === 'open' || t.status === 'pending').length;

  const systemBalance = approvedDepositsTotal - completedWithdrawalsTotal;

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      activePlansCount,
      pendingDepositsCount: pendingDeposits.length,
      approvedDepositsTotal,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      completedWithdrawalsTotal,
      totalEarningsDistributed,
      totalReferralCommission,
      totalPromoRedemptions,
      openSupportTickets,
      systemBalance,
    },
    recentTransactions: data.transactions.slice(0, 10),
    recentUsers: data.users.slice(-5).reverse(),
  });
});

// Admin Users Management
apiRouter.get('/admin/users', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const { search, status, role } = req.query;

  let users = data.users.map((u) => {
    const { passwordHash, ...safe } = u;
    const balance = db.getUserBalance(u.id);
    const activePlan = data.userPlans.find((p) => p.userId === u.id && p.status === 'active');
    return {
      ...safe,
      balance,
      activePlanName: activePlan ? activePlan.planName : null,
    };
  });

  if (status && status !== 'all') {
    users = users.filter((u) => u.status === status);
  }
  if (role && role !== 'all') {
    users = users.filter((u) => u.role === role);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.referralCode.toLowerCase().includes(q)
    );
  }

  res.json({ users });
});

apiRouter.get('/admin/users/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getRawData();
  const user = data.users.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { passwordHash, ...safeUser } = user;
  const balance = db.getUserBalance(user.id);
  const userPlans = data.userPlans.filter((p) => p.userId === user.id);
  const deposits = data.deposits.filter((d) => d.userId === user.id);
  const withdrawals = data.withdrawals.filter((w) => w.userId === user.id);
  const transactions = data.transactions.filter((t) => t.userId === user.id);
  const referrals = data.users.filter((u) => u.referredBy === user.referralCode);

  res.json({
    user: safeUser,
    balance,
    userPlans,
    deposits,
    withdrawals,
    transactions,
    referrals,
  });
});

apiRouter.post('/admin/users/:id/status', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { status } = req.body;

  const data = db.getRawData();
  const user = data.users.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const oldStatus = user.status;
  user.status = status;

  db.addAuditLog(
    admin.id,
    admin.name,
    'UPDATE_USER_STATUS',
    'user',
    user.id,
    `Changed ${user.username} status from ${oldStatus} to ${status}`
  );

  db.persist();
  res.json({ message: `User status updated to ${status}.`, user });
});

apiRouter.post('/admin/users/:id/balance', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { amount, action, reason } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Please specify a valid positive amount.' });
    return;
  }

  const data = db.getRawData();
  const user = data.users.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  db.updateUserBalance(user.id, (bal) => {
    if (action === 'credit') {
      bal.totalBalance = Number((bal.totalBalance + numAmount).toFixed(2));
      bal.availableWithdrawal = Number((bal.availableWithdrawal + numAmount).toFixed(2));
    } else {
      bal.totalBalance = Math.max(0, Number((bal.totalBalance - numAmount).toFixed(2)));
      bal.availableWithdrawal = Math.max(0, Number((bal.availableWithdrawal - numAmount).toFixed(2)));
    }
  });

  const updatedBal = db.getUserBalance(user.id);
  db.addTransaction({
    userId: user.id,
    userName: user.name,
    type: action === 'credit' ? 'deposit' : 'withdrawal',
    amount: numAmount,
    isCredit: action === 'credit',
    balanceAfter: updatedBal.totalBalance,
    status: 'completed',
    description: `Admin manual balance adjustment (${action.toUpperCase()}): ${reason || 'System adjustment'}`,
  });

  db.addNotification(
    user.id,
    'Balance Adjusted by Support',
    `Your account balance was ${action === 'credit' ? 'credited' : 'debited'} by $${numAmount.toFixed(2)}. Note: ${reason || 'System balance update'}`,
    'system'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'MANUAL_BALANCE_ADJUSTMENT',
    'user',
    user.id,
    `${action.toUpperCase()} $${numAmount.toFixed(2)} to ${user.username}. Reason: ${reason}`
  );

  db.persist();

  res.json({
    message: `Successfully ${action}ed $${numAmount.toFixed(2)} to ${user.name}.`,
    balance: updatedBal,
  });
});

// Admin Deposits Management
apiRouter.get('/admin/deposits', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const { status, search } = req.query;

  let deposits = [...data.deposits];
  if (status && status !== 'all') {
    deposits = deposits.filter((d) => d.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    deposits = deposits.filter(
      (d) =>
        d.userName.toLowerCase().includes(q) ||
        d.userEmail.toLowerCase().includes(q) ||
        d.transactionRef.toLowerCase().includes(q)
    );
  }

  res.json({ deposits });
});

apiRouter.post('/admin/deposits/:id/approve', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { notes } = req.body;

  const data = db.getRawData();
  const deposit = data.deposits.find((d) => d.id === id);

  if (!deposit) {
    res.status(404).json({ error: 'Deposit request not found.' });
    return;
  }

  if (deposit.status !== 'pending') {
    res.status(400).json({ error: `Deposit is already marked as ${deposit.status}.` });
    return;
  }

  deposit.status = 'approved';
  deposit.reviewedAt = new Date().toISOString();
  deposit.reviewedBy = admin.name;
  if (notes) deposit.notes = notes;

  // Credit user balance
  db.updateUserBalance(deposit.userId, (bal) => {
    bal.totalBalance = Number((bal.totalBalance + deposit.netAmount).toFixed(2));
    bal.availableWithdrawal = Number((bal.availableWithdrawal + deposit.netAmount).toFixed(2));
    bal.totalDeposits = Number((bal.totalDeposits + deposit.amount).toFixed(2));
  });

  // Update transaction status
  const tx = data.transactions.find((t) => t.referenceId === deposit.id);
  const updatedBal = db.getUserBalance(deposit.userId);
  if (tx) {
    tx.status = 'completed';
    tx.balanceAfter = updatedBal.totalBalance;
  }

  db.addNotification(
    deposit.userId,
    'Deposit Approved!',
    `Your deposit of $${deposit.amount.toFixed(2)} via ${deposit.methodName} has been approved and credited.`,
    'deposit'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'APPROVE_DEPOSIT',
    'deposit',
    deposit.id,
    `Approved $${deposit.amount} (${deposit.methodName}) for ${deposit.userName}`
  );

  db.persist();

  res.json({ message: 'Deposit approved successfully!', deposit });
});

apiRouter.post('/admin/deposits/:id/reject', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  const data = db.getRawData();
  const deposit = data.deposits.find((d) => d.id === id);

  if (!deposit) {
    res.status(404).json({ error: 'Deposit request not found.' });
    return;
  }

  if (deposit.status !== 'pending') {
    res.status(400).json({ error: `Deposit is already ${deposit.status}.` });
    return;
  }

  deposit.status = 'rejected';
  deposit.reviewedAt = new Date().toISOString();
  deposit.reviewedBy = admin.name;
  deposit.notes = reason || 'Verification failed. Transaction reference mismatch.';

  // Update transaction
  const tx = data.transactions.find((t) => t.referenceId === deposit.id);
  if (tx) {
    tx.status = 'rejected';
  }

  db.addNotification(
    deposit.userId,
    'Deposit Rejected',
    `Your deposit of $${deposit.amount.toFixed(2)} was rejected. Reason: ${deposit.notes}`,
    'deposit'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'REJECT_DEPOSIT',
    'deposit',
    deposit.id,
    `Rejected $${deposit.amount} for ${deposit.userName}. Reason: ${deposit.notes}`
  );

  db.persist();

  res.json({ message: 'Deposit rejected.', deposit });
});

// Admin Withdrawals Management
apiRouter.get('/admin/withdrawals', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const { status, search } = req.query;

  let withdrawals = [...data.withdrawals];
  if (status && status !== 'all') {
    withdrawals = withdrawals.filter((w) => w.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    withdrawals = withdrawals.filter(
      (w) =>
        w.userName.toLowerCase().includes(q) ||
        w.userEmail.toLowerCase().includes(q) ||
        w.accountDetails.toLowerCase().includes(q)
    );
  }

  res.json({ withdrawals });
});

apiRouter.post('/admin/withdrawals/:id/complete', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { notes } = req.body;

  const data = db.getRawData();
  const withdrawal = data.withdrawals.find((w) => w.id === id);

  if (!withdrawal) {
    res.status(404).json({ error: 'Withdrawal request not found.' });
    return;
  }

  withdrawal.status = 'completed';
  withdrawal.reviewedAt = new Date().toISOString();
  if (notes) withdrawal.notes = notes;

  // Update totalWithdrawals stats
  db.updateUserBalance(withdrawal.userId, (bal) => {
    bal.totalWithdrawals = Number((bal.totalWithdrawals + withdrawal.amount).toFixed(2));
  });

  const tx = data.transactions.find((t) => t.referenceId === withdrawal.id);
  if (tx) {
    tx.status = 'completed';
  }

  db.addNotification(
    withdrawal.userId,
    'Withdrawal Completed & Dispatched',
    `Your payout of $${withdrawal.netAmount.toFixed(2)} to ${withdrawal.methodName} has been processed successfully.`,
    'withdrawal'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'COMPLETE_WITHDRAWAL',
    'withdrawal',
    withdrawal.id,
    `Completed $${withdrawal.amount} to ${withdrawal.userName}`
  );

  db.persist();

  res.json({ message: 'Withdrawal marked as completed!', withdrawal });
});

apiRouter.post('/admin/withdrawals/:id/reject', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  const data = db.getRawData();
  const withdrawal = data.withdrawals.find((w) => w.id === id);

  if (!withdrawal) {
    res.status(404).json({ error: 'Withdrawal request not found.' });
    return;
  }

  if (withdrawal.status === 'completed') {
    res.status(400).json({ error: 'Cannot reject an already completed withdrawal.' });
    return;
  }

  withdrawal.status = 'rejected';
  withdrawal.reviewedAt = new Date().toISOString();
  withdrawal.notes = reason || 'Invalid payment credentials or compliance check.';

  // Refund locked amount back to user's balance
  db.updateUserBalance(withdrawal.userId, (bal) => {
    bal.totalBalance = Number((bal.totalBalance + withdrawal.amount).toFixed(2));
    bal.availableWithdrawal = Number((bal.availableWithdrawal + withdrawal.amount).toFixed(2));
  });

  const tx = data.transactions.find((t) => t.referenceId === withdrawal.id);
  if (tx) {
    tx.status = 'rejected';
  }

  db.addNotification(
    withdrawal.userId,
    'Withdrawal Request Rejected',
    `Your withdrawal of $${withdrawal.amount.toFixed(2)} was rejected and refunded to your available balance. Reason: ${withdrawal.notes}`,
    'withdrawal'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'REJECT_WITHDRAWAL',
    'withdrawal',
    withdrawal.id,
    `Rejected withdrawal of $${withdrawal.amount} for ${withdrawal.userName}. Refunded funds.`
  );

  db.persist();

  res.json({ message: 'Withdrawal rejected and balance refunded to user.', withdrawal });
});

// Admin Plans Management
apiRouter.get('/admin/plans', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ plans: data.plans });
});

apiRouter.post('/admin/plans', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { name, badge, price, dailyRoiPercent, validityDays, features, description } = req.body;

  const numPrice = parseFloat(price);
  const numRoi = parseFloat(dailyRoiPercent);
  const numDays = parseInt(validityDays, 10);

  if (!name || isNaN(numPrice) || isNaN(numRoi) || isNaN(numDays)) {
    res.status(400).json({ error: 'Please provide valid plan details.' });
    return;
  }

  const dailyIncome = Number(((numPrice * numRoi) / 100).toFixed(2));
  const totalReturnPercent = Number((numRoi * numDays).toFixed(1));

  const newPlan: InvestmentPlan = {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    badge: badge || 'New',
    price: numPrice,
    dailyRoiPercent: numRoi,
    dailyIncome,
    validityDays: numDays,
    totalReturnPercent,
    minDeposit: numPrice,
    features: Array.isArray(features) ? features : (features || '').split('\n').filter(Boolean),
    status: 'active',
    order: db.getRawData().plans.length + 1,
    description,
  };

  const data = db.getRawData();
  data.plans.push(newPlan);

  db.addAuditLog(
    admin.id,
    admin.name,
    'CREATE_PLAN',
    'plan',
    newPlan.id,
    `Created plan ${newPlan.name} with price $${newPlan.price}`
  );

  db.persist();
  res.json({ message: 'Investment plan created successfully!', plan: newPlan });
});

apiRouter.put('/admin/plans/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const updates = req.body;

  const data = db.getRawData();
  const plan = data.plans.find((p) => p.id === id);

  if (!plan) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }

  Object.assign(plan, updates);
  if (updates.price || updates.dailyRoiPercent) {
    plan.dailyIncome = Number(((plan.price * plan.dailyRoiPercent) / 100).toFixed(2));
    plan.totalReturnPercent = Number((plan.dailyRoiPercent * plan.validityDays).toFixed(1));
  }

  db.addAuditLog(admin.id, admin.name, 'UPDATE_PLAN', 'plan', plan.id, `Updated plan ${plan.name}`);
  db.persist();

  res.json({ message: 'Plan updated successfully!', plan });
});

apiRouter.delete('/admin/plans/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const data = db.getRawData();
  const plan = data.plans.find((p) => p.id === id);

  if (!plan) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }

  plan.status = plan.status === 'active' ? 'inactive' : 'active';
  db.addAuditLog(
    admin.id,
    admin.name,
    'TOGGLE_PLAN_STATUS',
    'plan',
    plan.id,
    `Toggled ${plan.name} status to ${plan.status}`
  );
  db.persist();

  res.json({ message: `Plan status changed to ${plan.status}.`, plan });
});

// Admin Payment Methods
apiRouter.get('/admin/payment-methods', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ methods: data.paymentMethods });
});

// Admin Payment Methods
apiRouter.get('/admin/payment-methods', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const data = db.getRawData();
  // Ensure every method has synced isActive and status
  const methods = (data.paymentMethods || []).map((m) => {
    const isAct = m.isActive !== false && m.status !== 'inactive';
    return {
      ...m,
      isActive: isAct,
      status: isAct ? 'active' : 'inactive',
    };
  });
  res.json({ methods });
});

apiRouter.post('/admin/payment-methods', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const {
    name,
    type,
    accountTitle,
    accountNumber,
    networkOrBranch,
    instructions,
    minDeposit,
    maxDeposit,
    feePercent,
    icon,
    isActive,
    currency,
  } = req.body;

  if (!name || !name.trim() || !accountTitle || !accountTitle.trim() || !accountNumber || !accountNumber.trim()) {
    res.status(400).json({ error: 'Gateway Name, Account Title, and Account Number are strictly required.' });
    return;
  }

  const cleanName = name.trim();
  const cleanTitle = accountTitle.trim();
  const cleanNumber = accountNumber.trim();

  // Infer type if not specified
  let detectedType = type;
  if (!detectedType) {
    const lower = cleanName.toLowerCase();
    if (lower.includes('crypto') || lower.includes('usdt') || lower.includes('binance') || lower.includes('trc')) {
      detectedType = 'crypto';
    } else if (lower.includes('bank') || lower.includes('meezan') || lower.includes('alfalah') || lower.includes('hbl') || lower.includes('ubl')) {
      detectedType = 'bank';
    } else {
      detectedType = 'mobile_wallet';
    }
  }

  // Infer default icon
  let resolvedIcon = icon;
  if (!resolvedIcon) {
    resolvedIcon = detectedType === 'crypto' ? 'coins' : detectedType === 'bank' ? 'landmark' : 'smartphone';
  }

  const isMethodActive = isActive !== false;
  const data = db.getRawData();

  const newMethod: PaymentMethod = {
    id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    type: detectedType,
    accountTitle: cleanTitle,
    accountNumber: cleanNumber,
    currency: currency || (detectedType === 'crypto' ? 'USDT' : 'PKR'),
    networkOrBranch: networkOrBranch?.trim() || undefined,
    instructions:
      instructions?.trim() ||
      'Send payment to this account. After successful transfer, paste your 12-digit TID / Transaction ID below.',
    minDeposit: parseFloat(minDeposit) > 0 ? parseFloat(minDeposit) : 10,
    maxDeposit: parseFloat(maxDeposit) > 0 ? parseFloat(maxDeposit) : 5000,
    feePercent: parseFloat(feePercent) >= 0 ? parseFloat(feePercent) : 0,
    status: isMethodActive ? 'active' : 'inactive',
    isActive: isMethodActive,
    icon: resolvedIcon,
    order: (data.paymentMethods?.length || 0) + 1,
  };

  data.paymentMethods.push(newMethod);

  db.addAuditLog(
    admin.id,
    admin.name,
    'CREATE_PAYMENT_METHOD',
    'payment_method',
    newMethod.id,
    `Added receiving account: ${newMethod.name} (${newMethod.accountNumber} - ${newMethod.accountTitle})`
  );
  db.persist();

  res.json({ message: `Payment gateway "${newMethod.name}" added successfully.`, method: newMethod });
});

apiRouter.put('/admin/payment-methods/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const updates = req.body;

  const data = db.getRawData();
  const method = data.paymentMethods.find((m) => m.id === id);

  if (!method) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  if (updates.name !== undefined) method.name = updates.name.trim();
  if (updates.accountTitle !== undefined) method.accountTitle = updates.accountTitle.trim();
  if (updates.accountNumber !== undefined) method.accountNumber = updates.accountNumber.trim();
  if (updates.networkOrBranch !== undefined) method.networkOrBranch = updates.networkOrBranch?.trim() || undefined;
  if (updates.instructions !== undefined) method.instructions = updates.instructions.trim();
  if (updates.icon !== undefined) method.icon = updates.icon;
  if (updates.currency !== undefined) method.currency = updates.currency;
  if (updates.type !== undefined) method.type = updates.type;

  if (updates.minDeposit !== undefined) {
    const val = parseFloat(updates.minDeposit);
    if (!isNaN(val) && val >= 0) method.minDeposit = val;
  }
  if (updates.maxDeposit !== undefined) {
    const val = parseFloat(updates.maxDeposit);
    if (!isNaN(val) && val > 0) method.maxDeposit = val;
  }
  if (updates.feePercent !== undefined) {
    const val = parseFloat(updates.feePercent);
    if (!isNaN(val) && val >= 0) method.feePercent = val;
  }

  if (updates.isActive !== undefined) {
    method.isActive = Boolean(updates.isActive);
    method.status = method.isActive ? 'active' : 'inactive';
  } else if (updates.status !== undefined) {
    method.isActive = updates.status === 'active';
    method.status = method.isActive ? 'active' : 'inactive';
  }

  db.addAuditLog(
    admin.id,
    admin.name,
    'UPDATE_PAYMENT_METHOD',
    'payment_method',
    method.id,
    `Updated receiving account: ${method.name} -> No: ${method.accountNumber}, Title: ${method.accountTitle}`
  );
  db.persist();

  res.json({ message: `Payment gateway "${method.name}" updated successfully.`, method });
});

// Quick toggle active / disabled for instant 1-click status change
apiRouter.patch('/admin/payment-methods/:id/toggle', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;

  const data = db.getRawData();
  const method = data.paymentMethods.find((m) => m.id === id);

  if (!method) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  const currentlyActive = method.isActive !== false && method.status !== 'inactive';
  const newActive = !currentlyActive;

  method.isActive = newActive;
  method.status = newActive ? 'active' : 'inactive';

  db.addAuditLog(
    admin.id,
    admin.name,
    'UPDATE_PAYMENT_METHOD',
    'payment_method',
    method.id,
    `${newActive ? 'Enabled' : 'Disabled'} payment gateway ${method.name}`
  );
  db.persist();

  res.json({
    message: `Payment gateway "${method.name}" is now ${newActive ? 'Active' : 'Disabled'}.`,
    method,
  });
});

// Quick number and account title edit for instant updates
apiRouter.patch('/admin/payment-methods/:id/quick-number', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const { accountNumber, accountTitle } = req.body;

  if (!accountNumber || !accountNumber.trim()) {
    res.status(400).json({ error: 'Account number cannot be empty.' });
    return;
  }

  const data = db.getRawData();
  const method = data.paymentMethods.find((m) => m.id === id);

  if (!method) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  method.accountNumber = accountNumber.trim();
  if (accountTitle && accountTitle.trim()) {
    method.accountTitle = accountTitle.trim();
  }

  db.addAuditLog(
    admin.id,
    admin.name,
    'UPDATE_PAYMENT_METHOD',
    'payment_method',
    method.id,
    `Instant update of account number for ${method.name}: ${method.accountNumber}`
  );
  db.persist();

  res.json({
    message: `Account number for "${method.name}" updated to "${method.accountNumber}" immediately.`,
    method,
  });
});

apiRouter.delete('/admin/payment-methods/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;

  const data = db.getRawData();
  const idx = data.paymentMethods.findIndex((m) => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  const [removed] = data.paymentMethods.splice(idx, 1);
  db.addAuditLog(
    admin.id,
    admin.name,
    'DELETE_PAYMENT_METHOD',
    'payment_method',
    removed.id,
    `Deleted payment gateway "${removed.name}" (${removed.accountNumber})`
  );
  db.persist();

  res.json({ message: `Payment gateway "${removed.name}" deleted.`, method: removed });
});

// Admin Promo Codes
apiRouter.get('/admin/promo-codes', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ promoCodes: data.promoCodes, promos: data.promoCodes });
});

apiRouter.post('/admin/promo-codes', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { code, rewardAmount, maxUses, usageLimit, expiryDate, description } = req.body;

  if (!code || !rewardAmount) {
    res.status(400).json({ error: 'Code and reward amount required.' });
    return;
  }

  const limit = parseInt(usageLimit || maxUses, 10) || 100;
  const newPromo: PromoCode = {
    id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    code: code.trim().toUpperCase(),
    rewardAmount: parseFloat(rewardAmount),
    maxUses: limit,
    usageLimit: limit,
    usedCount: 0,
    startDate: new Date().toISOString(),
    expiryDate: expiryDate || '2026-12-31T23:59:59.000Z',
    status: 'active',
    description: description || 'Promotional cash voucher',
    createdAt: new Date().toISOString(),
  };

  const data = db.getRawData();
  data.promoCodes.unshift(newPromo);

  db.addAuditLog(admin.id, admin.name, 'CREATE_PROMO_CODE', 'promo_code', newPromo.id, `Generated promo ${newPromo.code}`);
  db.persist();

  res.json({ message: 'Promo code generated successfully!', promoCode: newPromo, promo: newPromo });
});

apiRouter.delete('/admin/promo-codes/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;

  const data = db.getRawData();
  const idx = data.promoCodes.findIndex((p) => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Promo code not found' });
    return;
  }

  const [removed] = data.promoCodes.splice(idx, 1);
  db.addAuditLog(admin.id, admin.name, 'DELETE_PROMO_CODE', 'promo_code', removed.id, `Deleted promo ${removed.code}`);
  db.persist();

  res.json({ message: `Promo code "${removed.code}" deleted.`, promo: removed });
});

// Admin Team Milestones / Ranks Management
const handleGetMilestones = (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ milestones: data.teamMilestones || [] });
};

const handleCreateMilestone = (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { title, requiredMembers, requiredActiveMembers, rewardAmount, bonusReward, condition, description } = req.body;

  const reqCount = parseInt(requiredMembers || requiredActiveMembers, 10);
  const rewAmount = parseFloat(rewardAmount || bonusReward);

  if (!title || isNaN(reqCount) || isNaN(rewAmount)) {
    res.status(400).json({ error: 'Title, required members, and bonus reward amount are required.' });
    return;
  }

  const newMilestone: TeamMilestone = {
    id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    requiredMembers: reqCount,
    requiredActiveMembers: reqCount,
    rewardAmount: rewAmount,
    bonusReward: rewAmount,
    condition: condition || 'active_plan',
    status: 'active',
    order: (db.getRawData().teamMilestones || []).length + 1,
    description: description || `Reach ${reqCount} active team members to claim cash bonus.`,
  };

  const data = db.getRawData();
  if (!data.teamMilestones) data.teamMilestones = [];
  data.teamMilestones.push(newMilestone);

  db.addAuditLog(admin.id, admin.name, 'CREATE_MILESTONE', 'milestone', newMilestone.id, `Created milestone ${newMilestone.title}`);
  db.persist();

  res.json({ message: 'Team milestone created.', milestone: newMilestone });
};

const handleUpdateMilestone = (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const updates = req.body;
  const data = db.getRawData();

  const milestone = (data.teamMilestones || []).find((m) => m.id === id);
  if (!milestone) {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  if (updates.title) milestone.title = updates.title;
  if (updates.requiredMembers !== undefined || updates.requiredActiveMembers !== undefined) {
    const count = parseInt(updates.requiredMembers ?? updates.requiredActiveMembers, 10);
    milestone.requiredMembers = count;
    milestone.requiredActiveMembers = count;
  }
  if (updates.rewardAmount !== undefined || updates.bonusReward !== undefined) {
    const amt = parseFloat(updates.rewardAmount ?? updates.bonusReward);
    milestone.rewardAmount = amt;
    milestone.bonusReward = amt;
  }
  if (updates.condition) milestone.condition = updates.condition;
  if (updates.status) milestone.status = updates.status;
  if (updates.description !== undefined) milestone.description = updates.description;

  db.addAuditLog(admin.id, admin.name, 'UPDATE_MILESTONE', 'milestone', milestone.id, `Updated milestone ${milestone.title}`);
  db.persist();

  res.json({ message: 'Milestone updated successfully.', milestone });
};

const handleDeleteMilestone = (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const data = db.getRawData();

  const index = (data.teamMilestones || []).findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  const removed = data.teamMilestones.splice(index, 1)[0];
  db.addAuditLog(admin.id, admin.name, 'DELETE_MILESTONE', 'milestone', id, `Deleted milestone ${removed.title}`);
  db.persist();

  res.json({ message: 'Milestone deleted successfully.' });
};

apiRouter.get('/admin/team-milestones', authenticateUser, requireAdmin, handleGetMilestones);
apiRouter.get('/admin/milestones', authenticateUser, requireAdmin, handleGetMilestones);

apiRouter.post('/admin/team-milestones', authenticateUser, requireAdmin, handleCreateMilestone);
apiRouter.post('/admin/milestones', authenticateUser, requireAdmin, handleCreateMilestone);

apiRouter.put('/admin/team-milestones/:id', authenticateUser, requireAdmin, handleUpdateMilestone);
apiRouter.put('/admin/milestones/:id', authenticateUser, requireAdmin, handleUpdateMilestone);

apiRouter.delete('/admin/team-milestones/:id', authenticateUser, requireAdmin, handleDeleteMilestone);
apiRouter.delete('/admin/milestones/:id', authenticateUser, requireAdmin, handleDeleteMilestone);

// ==========================================
// Admin Salary Management
// ==========================================

apiRouter.get('/admin/salary/tiers', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const tiers = (data.salaryTiers || []).sort((a, b) => (a.order || 0) - (b.order || 0) || a.requiredMembers - b.requiredMembers);
  res.json({ tiers });
});

apiRouter.post('/admin/salary/tiers', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { title, requiredMembers, weeklySalary, condition, description, status } = req.body;

  const reqCount = parseInt(requiredMembers, 10);
  const salaryAmount = parseFloat(weeklySalary);

  if (!title || isNaN(reqCount) || isNaN(salaryAmount) || salaryAmount <= 0) {
    res.status(400).json({ error: 'Please specify tier title, required members, and weekly salary amount.' });
    return;
  }

  const data = db.getRawData();
  if (!data.salaryTiers) data.salaryTiers = [];

  const newTier: SalaryTier = {
    id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    requiredMembers: reqCount,
    weeklySalary: salaryAmount,
    condition: condition || 'active_plan',
    status: status || 'active',
    order: data.salaryTiers.length + 1,
    description: description || `Maintain ${reqCount} active members to receive $${salaryAmount.toFixed(2)} weekly.`,
  };

  data.salaryTiers.push(newTier);

  db.addAuditLog(admin.id, admin.name, 'CREATE_SALARY_TIER', 'salary_tier', newTier.id, `Created salary tier ${newTier.title} ($${salaryAmount}/wk)`);
  db.persist();

  res.json({ message: 'Salary tier created successfully.', tier: newTier });
});

apiRouter.put('/admin/salary/tiers/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const updates = req.body;
  const data = db.getRawData();

  const tier = (data.salaryTiers || []).find((t) => t.id === id);
  if (!tier) {
    res.status(404).json({ error: 'Salary tier not found' });
    return;
  }

  if (updates.title) tier.title = updates.title;
  if (updates.requiredMembers !== undefined) tier.requiredMembers = parseInt(updates.requiredMembers, 10);
  if (updates.weeklySalary !== undefined) tier.weeklySalary = parseFloat(updates.weeklySalary);
  if (updates.condition) tier.condition = updates.condition;
  if (updates.status) tier.status = updates.status;
  if (updates.description !== undefined) tier.description = updates.description;
  if (updates.order !== undefined) tier.order = parseInt(updates.order, 10);

  db.addAuditLog(admin.id, admin.name, 'UPDATE_SALARY_TIER', 'salary_tier', tier.id, `Updated salary tier ${tier.title} to $${tier.weeklySalary}/wk`);
  db.persist();

  res.json({ message: 'Salary tier updated successfully.', tier });
});

apiRouter.delete('/admin/salary/tiers/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { id } = req.params;
  const data = db.getRawData();

  const index = (data.salaryTiers || []).findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Salary tier not found' });
    return;
  }

  const removed = data.salaryTiers.splice(index, 1)[0];
  db.addAuditLog(admin.id, admin.name, 'DELETE_SALARY_TIER', 'salary_tier', id, `Deleted salary tier ${removed.title}`);
  db.persist();

  res.json({ message: 'Salary tier deleted successfully.' });
});

apiRouter.get('/admin/salary/payouts', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const payouts = (data.salaryPayouts || []).sort(
    (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
  );
  res.json({ payouts });
});

apiRouter.post('/admin/salary/pay-manual', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { userId, amount, tierTitle, notes } = req.body;

  const numAmount = parseFloat(amount);
  if (!userId || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'User ID and positive salary amount are required.' });
    return;
  }

  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const now = new Date();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const nextDate = new Date(now.getTime() + WEEK_MS);

  const newPayout: SalaryPayout = {
    id: `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: targetUser.id,
    userName: targetUser.name,
    userEmail: targetUser.email,
    tierId: 'manual',
    tierTitle: tierTitle || 'Admin Special Weekly Salary',
    weeklySalary: numAmount,
    memberCount: 0,
    claimedAt: now.toISOString(),
    nextClaimDate: nextDate.toISOString(),
    status: 'paid',
    transactionRef: `SAL-MANUAL-${Date.now().toString().slice(-4)}`,
  };

  if (!data.salaryPayouts) data.salaryPayouts = [];
  data.salaryPayouts.unshift(newPayout);

  db.updateUserBalance(targetUser.id, (bal) => {
    bal.totalBalance = Number((bal.totalBalance + numAmount).toFixed(2));
    bal.availableWithdrawal = Number((bal.availableWithdrawal + numAmount).toFixed(2));
    bal.teamRewards = Number((bal.teamRewards + numAmount).toFixed(2));
  });

  const updatedBal = db.getUserBalance(targetUser.id);
  db.addTransaction({
    userId: targetUser.id,
    userName: targetUser.name,
    type: 'salary',
    amount: numAmount,
    isCredit: true,
    balanceAfter: updatedBal.totalBalance,
    status: 'completed',
    description: `Manual Salary Credit: ${tierTitle || 'Special Weekly Salary'} ($${numAmount.toFixed(2)}) ${notes ? `- ${notes}` : ''}`,
    referenceId: newPayout.id,
  });

  db.addNotification(
    targetUser.id,
    'Weekly Salary Paid by Admin',
    `You have received a weekly salary payout of $${numAmount.toFixed(2)} (${tierTitle || 'Special Weekly Salary'}).`,
    'earning'
  );

  db.addAuditLog(
    admin.id,
    admin.name,
    'MANUAL_SALARY_PAYOUT',
    'salary',
    newPayout.id,
    `Paid $${numAmount.toFixed(2)} manual salary to ${targetUser.name} (${targetUser.username})`
  );

  db.persist();

  res.json({
    message: `Successfully paid $${numAmount.toFixed(2)} salary to ${targetUser.name}.`,
    payout: newPayout,
    balance: updatedBal,
  });
});

// Admin All Transactions
apiRouter.get('/admin/transactions', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  const { type, status, search } = req.query;

  let txs = [...data.transactions];
  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }
  if (status && status !== 'all') {
    txs = txs.filter((t) => t.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    txs = txs.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q)
    );
  }

  res.json({ transactions: txs });
});

// Admin Support Tickets
apiRouter.get('/admin/support', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ tickets: data.supportTickets });
});

// Public Platform Settings for dynamic platform name, announcement, PKR rate, and support links
apiRouter.get('/public-settings', (req: Request, res: Response) => {
  const data = db.getRawData();
  const s = data.settings || ({} as any);
  res.json({
    settings: {
      siteName: s.siteName || 'AssetFlow',
      tagline: s.tagline || 'Next-Gen Automated Yield & Staking Platform',
      currency: s.currency || 'USD',
      currencySymbol: s.currencySymbol || '$',
      usdToPkrRate: s.usdToPkrRate || 280.0,
      minDeposit: s.minDeposit ?? 10.0,
      maxDeposit: s.maxDeposit ?? 5000.0,
      minWithdrawal: s.minWithdrawal ?? 2.0,
      maxWithdrawal: s.maxWithdrawal ?? 10000.0,
      withdrawalFeePercent: s.withdrawalFeePercent ?? 0.0,
      referralCommissionPercent: s.referralCommissionPercent ?? 6.0,
      dailyEarningCycleHours: s.dailyEarningCycleHours ?? 24,
      supportEmail: s.supportEmail || 'support@assetflow.com',
      supportPhone: s.supportPhone || '+92 300 1234567',
      supportWhatsApp: s.supportWhatsApp || 'https://wa.me/923001234567',
      supportTelegram: s.supportTelegram || 'https://t.me/assetflow_official',
      announcementText: s.announcementText || 'Special Weekend Earning Multiplier is active for all Gold and Diamond plans!',
      showAnnouncement: s.showAnnouncement !== false,
      maintenanceMode: !!s.maintenanceMode,
      withdrawalTimingEnabled: !!s.withdrawalTimingEnabled,
      withdrawalStartTime: s.withdrawalStartTime || '09:00',
      withdrawalEndTime: s.withdrawalEndTime || '18:00',
      withdrawalAllowedDays: s.withdrawalAllowedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      withdrawalTimezoneOffset: s.withdrawalTimezoneOffset ?? 5,
      withdrawalTimezoneName: s.withdrawalTimezoneName || 'PKT (UTC+5)',
      withdrawalClosedMessage: s.withdrawalClosedMessage || 'Withdrawals are currently closed. Requests are only accepted from 09:00 AM to 06:00 PM (Monday to Saturday) PKT.',
      withdrawalBoxes: Array.isArray(s.withdrawalBoxes) && s.withdrawalBoxes.length > 0 ? s.withdrawalBoxes : [2, 4, 8, 10, 20, 30, 40, 50, 70, 100],
      isWithdrawalOpen: checkWithdrawalWindow(s).allowed,
      withdrawalWindowReason: checkWithdrawalWindow(s).message,
    },
  });
});

// Admin change own password ("panel ka password")
apiRouter.post('/admin/change-password', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters.' });
      return;
    }

    const data = db.getRawData();
    const adminUser = data.users.find((u) => u.id === admin.id);

    if (!adminUser) {
      res.status(404).json({ error: 'Admin account not found.' });
      return;
    }

    if (currentPassword && !verifyPassword(currentPassword, adminUser.passwordHash)) {
      res.status(400).json({ error: 'Current admin password is incorrect.' });
      return;
    }

    adminUser.passwordHash = hashPassword(newPassword.trim());
    db.addAuditLog(
      admin.id,
      admin.name,
      'CHANGE_ADMIN_PASSWORD',
      'admin',
      admin.id,
      'Admin updated master backoffice panel password'
    );
    db.persist();

    res.json({ success: true, message: 'Admin backoffice password successfully updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update admin password.' });
  }
});

// Admin change any user's password ("har user ka password change kr saky")
apiRouter.post('/admin/users/:id/change-password', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters.' });
      return;
    }

    const data = db.getRawData();
    const targetUser = data.users.find((u) => u.id === id);

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    targetUser.passwordHash = hashPassword(newPassword.trim());

    db.addAuditLog(
      admin.id,
      admin.name,
      'CHANGE_USER_PASSWORD',
      'user',
      targetUser.id,
      `Admin updated password for user @${targetUser.username} (${targetUser.name})`
    );

    db.addNotification(
      targetUser.id,
      'Password Updated by Admin',
      'Your account password has been updated by system administration. Please use your new password next time you log in.',
      'system'
    );

    db.persist();

    res.json({
      success: true,
      message: `Password for @${targetUser.username} (${targetUser.name}) updated successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user password.' });
  }
});

// Admin Platform Settings
apiRouter.get('/admin/settings', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ settings: data.settings });
});

apiRouter.put('/admin/settings', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const updates = req.body;
  const data = db.getRawData();

  Object.assign(data.settings, updates);

  // Sync minDeposit & maxDeposit directly across all active payment methods
  if (typeof updates.minDeposit === 'number' || typeof updates.maxDeposit === 'number') {
    data.paymentMethods.forEach((m) => {
      if (typeof updates.minDeposit === 'number') {
        m.minDeposit = updates.minDeposit;
      }
      if (typeof updates.maxDeposit === 'number') {
        m.maxDeposit = updates.maxDeposit;
      }
    });
  }

  db.addAuditLog(admin.id, admin.name, 'UPDATE_SETTINGS', 'settings', 'global', 'Updated platform configuration');
  db.persist();

  res.json({ message: 'Platform settings saved.', settings: data.settings });
});

// Admin Audit Logs
apiRouter.get('/admin/audit-logs', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getRawData();
  res.json({ auditLogs: data.auditLogs.slice(0, 100) });
});
