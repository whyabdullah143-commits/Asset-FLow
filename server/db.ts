import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  UserBalance,
  InvestmentPlan,
  UserPlan,
  PaymentMethod,
  DepositRequest,
  WithdrawalRequest,
  Transaction,
  PromoCode,
  PromoRedemption,
  TeamMilestone,
  TeamMilestoneClaim,
  SalaryTier,
  SalaryPayout,
  SupportTicket,
  SupportMessage,
  NotificationItem,
  PlatformSettings,
  AuditLog,
} from '../src/types.js';

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  balances: Record<string, UserBalance>;
  plans: InvestmentPlan[];
  userPlans: UserPlan[];
  paymentMethods: PaymentMethod[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: Transaction[];
  promoCodes: PromoCode[];
  promoRedemptions: PromoRedemption[];
  teamMilestones: TeamMilestone[];
  teamMilestoneClaims: TeamMilestoneClaim[];
  salaryTiers: SalaryTier[];
  salaryPayouts: SalaryPayout[];
  supportTickets: SupportTicket[];
  supportMessages: SupportMessage[];
  notifications: NotificationItem[];
  settings: PlatformSettings;
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default initial database seed
function createInitialSeed(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('abdullah', salt);

  const adminId = 'usr_admin_001';

  const users: (User & { passwordHash: string })[] = [
    {
      id: adminId,
      name: 'Master Admin',
      username: 'admin',
      email: 'admin@assetflow.com',
      phone: '+92 300 0000000',
      role: 'admin',
      status: 'active',
      referralCode: 'ADMIN777',
      createdAt: '2025-01-01T00:00:00.000Z',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      passwordHash: adminHash,
    },
  ];

  const balances: Record<string, UserBalance> = {
    [adminId]: {
      userId: adminId,
      totalBalance: 0.0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      todayEarnings: 0,
      totalEarnings: 0,
      availableWithdrawal: 0.0,
      referralCommission: 0,
      teamRewards: 0,
      promoRewards: 0,
    },
  };

  const plans: InvestmentPlan[] = [
    {
      id: 'plan_starter_bronze',
      name: 'Bronze Starter',
      badge: 'Starter',
      price: 50,
      dailyRoiPercent: 3.5,
      dailyIncome: 1.75,
      validityDays: 40,
      totalReturnPercent: 140,
      minDeposit: 50,
      features: [
        'Daily ROI: 3.50% ($1.75/day)',
        'Duration: 40 Days',
        'Total Return: 140% ($70.00)',
        'Principal Included in Daily Returns',
        'Instant Daily Earnings Claim',
        'Standard 24/7 Support',
      ],
      status: 'active',
      order: 1,
      description: 'Ideal starting tier for beginners wanting consistent daily automated returns.',
    },
    {
      id: 'plan_silver_growth',
      name: 'Silver Growth',
      badge: 'Popular',
      price: 150,
      dailyRoiPercent: 4.0,
      dailyIncome: 6.0,
      validityDays: 35,
      totalReturnPercent: 140,
      minDeposit: 150,
      features: [
        'Daily ROI: 4.00% ($6.00/day)',
        'Duration: 35 Days',
        'Total Return: 140% ($210.00)',
        'Instant Daily Claim',
        'Priority Referral Bonus',
        'Fast Track Withdrawal processing',
      ],
      status: 'active',
      order: 2,
      description: 'Our most favored plan for steady capital compounding and boosted team rewards.',
    },
    {
      id: 'plan_gold_pro',
      name: 'Gold Pro',
      badge: 'High Yield',
      price: 500,
      dailyRoiPercent: 4.5,
      dailyIncome: 22.5,
      validityDays: 35,
      totalReturnPercent: 157.5,
      minDeposit: 500,
      features: [
        'Daily ROI: 4.50% ($22.50/day)',
        'Duration: 35 Days',
        'Total Return: 157.5% ($787.50)',
        'Exclusive VIP Ticket Support',
        'Zero-fee Withdrawals',
        'Higher Referral Tier Commission (8%)',
      ],
      status: 'active',
      order: 3,
      description: 'Engineered for dedicated investors seeking superior yield and VIP treatment.',
    },
    {
      id: 'plan_diamond_elite',
      name: 'Diamond Elite',
      badge: 'Maximum Yield',
      price: 1200,
      dailyRoiPercent: 5.2,
      dailyIncome: 62.4,
      validityDays: 30,
      totalReturnPercent: 156,
      minDeposit: 1200,
      features: [
        'Daily ROI: 5.20% ($62.40/day)',
        'Duration: 30 Days',
        'Total Return: 156% ($1,872.00)',
        'Direct Account Manager',
        'Same-day Expedited Withdrawals',
        'Maximum Milestone multipliers',
      ],
      status: 'active',
      order: 4,
      description: 'Institutional-grade investment tier offering prime algorithmic yield allocation.',
    },
  ];

  const userPlans: UserPlan[] = [];

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'pm_jazzcash',
      name: 'JazzCash',
      type: 'mobile_wallet',
      accountTitle: 'AssetFlow Finance Ltd',
      accountNumber: '0300 9876543',
      networkOrBranch: 'JazzCash Pakistan',
      instructions:
        'Send funds to JazzCash account 0300 9876543 (Title: AssetFlow Finance Ltd). After transfer, paste your 12-digit TID / Reference ID below.',
      minDeposit: 10,
      maxDeposit: 5000,
      feePercent: 0,
      status: 'active',
      icon: 'smartphone',
      order: 1,
    },
    {
      id: 'pm_easypaisa',
      name: 'Easypaisa',
      type: 'mobile_wallet',
      accountTitle: 'AssetFlow Global Pay',
      accountNumber: '0345 1122334',
      networkOrBranch: 'Telenor Easypaisa',
      instructions:
        'Transfer funds via Easypaisa App to 0345 1122334 (Title: AssetFlow Global Pay). Enter transaction ID (TRX ID) from your SMS or receipt.',
      minDeposit: 10,
      maxDeposit: 5000,
      feePercent: 0,
      status: 'active',
      icon: 'wallet',
      order: 2,
    },
    {
      id: 'pm_usdt_trc20',
      name: 'USDT (TRC-20)',
      type: 'crypto',
      accountTitle: 'AssetFlow USDT Reserve Vault',
      accountNumber: 'TYQ3N9Lq24RkH7KxB9u12wSmJ7xVzP987a',
      networkOrBranch: 'TRON TRC-20 Network ONLY',
      instructions:
        'Send exact USDT via TRC-20 network to the address provided. Transactions on other chains (ERC-20/BEP-20) cannot be recovered. Enter the TXID hash.',
      minDeposit: 20,
      maxDeposit: 25000,
      feePercent: 1.0,
      status: 'active',
      icon: 'coins',
      order: 3,
    },
    {
      id: 'pm_bank_transfer',
      name: 'Bank Transfer (Meezan / Alfalah)',
      type: 'bank',
      accountTitle: 'AssetFlow Financial Technologies SMC-Pvt Ltd',
      accountNumber: '0101 0102 9948 2201 (IBAN: PK36MEZN0001010102994822)',
      networkOrBranch: 'Meezan Bank Ltd (Gulberg Branch, Lahore)',
      instructions:
        'Perform IBFT (Inter-Bank Funds Transfer) to Meezan Bank. Attach receipt image or provide the 10-16 character bank reference confirmation number.',
      minDeposit: 50,
      maxDeposit: 50000,
      feePercent: 0,
      status: 'active',
      icon: 'landmark',
      order: 4,
    },
  ];

  const deposits: DepositRequest[] = [];

  const withdrawals: WithdrawalRequest[] = [];

  const transactions: Transaction[] = [];

  const promoCodes: PromoCode[] = [];

  const promoRedemptions: PromoRedemption[] = [];

  const teamMilestones: TeamMilestone[] = [
    {
      id: 'ms_001',
      title: 'Rank 1 - Silver Leader (10 Members)',
      requiredMembers: 10,
      rewardAmount: 20.0,
      condition: 'active_plan',
      status: 'active',
      order: 1,
      description: 'Build 10 active team referrals to unlock Rank 1 and claim an instant $20 cash bonus.',
    },
    {
      id: 'ms_002',
      title: 'Rank 2 - Gold Executive (20 Members)',
      requiredMembers: 20,
      rewardAmount: 50.0,
      condition: 'active_plan',
      status: 'active',
      order: 2,
      description: 'Build 20 active team referrals to unlock Rank 2 and claim an instant $50 cash bonus.',
    },
    {
      id: 'ms_003',
      title: 'Rank 3 - Platinum Director (30 Members)',
      requiredMembers: 30,
      rewardAmount: 90.0,
      condition: 'active_plan',
      status: 'active',
      order: 3,
      description: 'Build 30 active team referrals to unlock Rank 3 and claim an instant $90 cash bonus.',
    },
    {
      id: 'ms_004',
      title: 'Rank 4 - Sapphire Ambassador (50 Members)',
      requiredMembers: 50,
      rewardAmount: 180.0,
      condition: 'active_plan',
      status: 'active',
      order: 4,
      description: 'Build 50 active team referrals to unlock Rank 4 and claim an instant $180 cash bonus.',
    },
    {
      id: 'ms_005',
      title: 'Rank 5 - Diamond Sovereign (100 Members)',
      requiredMembers: 100,
      rewardAmount: 450.0,
      condition: 'active_plan',
      status: 'active',
      order: 5,
      description: 'Build 100 active team referrals to unlock Rank 5 and claim an instant $450 cash bonus.',
    },
  ];

  const teamMilestoneClaims: TeamMilestoneClaim[] = [];

  const salaryTiers: SalaryTier[] = [
    {
      id: 'st_001',
      title: 'Tier 1 - Bronze Leader (10 Members)',
      requiredMembers: 10,
      weeklySalary: 25.0,
      condition: 'active_plan',
      status: 'active',
      order: 1,
      description: 'Build 10 active investor referrals to receive guaranteed $25.00 every single week.',
    },
    {
      id: 'st_002',
      title: 'Tier 2 - Silver Executive (20 Members)',
      requiredMembers: 20,
      weeklySalary: 60.0,
      condition: 'active_plan',
      status: 'active',
      order: 2,
      description: 'Maintain 20 active investor referrals to claim $60.00 weekly recurring payroll.',
    },
    {
      id: 'st_003',
      title: 'Tier 3 - Gold Ambassador (30 Members)',
      requiredMembers: 30,
      weeklySalary: 100.0,
      condition: 'active_plan',
      status: 'active',
      order: 3,
      description: 'Command a network of 30 active team members and receive $100.00 weekly salary.',
    },
    {
      id: 'st_004',
      title: 'Tier 4 - Platinum Director (50 Members)',
      requiredMembers: 50,
      weeklySalary: 200.0,
      condition: 'active_plan',
      status: 'active',
      order: 4,
      description: 'Command 50 active team members to receive $200.00 weekly salary directly into your balance.',
    },
    {
      id: 'st_005',
      title: 'Tier 5 - Diamond Sovereign (100 Members)',
      requiredMembers: 100,
      weeklySalary: 500.0,
      condition: 'active_plan',
      status: 'active',
      order: 5,
      description: 'Top-tier executive level: 100 active investors provides $500.00 recurring weekly payroll.',
    },
  ];

  const salaryPayouts: SalaryPayout[] = [];

  const supportTickets: SupportTicket[] = [];

  const supportMessages: SupportMessage[] = [];

  const notifications: NotificationItem[] = [];

  const settings: PlatformSettings = {
    siteName: 'AssetFlow',
    tagline: 'Next-Gen Automated Yield & Staking Platform',
    currency: 'USD',
    currencySymbol: '$',
    usdToPkrRate: 280.0,
    referralCommissionPercent: 6.0,
    minDeposit: 10.0,
    minWithdrawal: 2.0,
    maxWithdrawal: 10000.0,
    withdrawalFeePercent: 0.0,
    dailyEarningCycleHours: 24,
    supportEmail: 'support@assetflow.com',
    supportPhone: '+92 300 1234567',
    supportWhatsApp: 'https://wa.me/923001234567',
    supportTelegram: 'https://t.me/assetflow_official',
    maintenanceMode: false,
    announcementText: 'Special Weekend Earning Multiplier is active for all Gold and Diamond plans!',
    showAnnouncement: true,
    withdrawalTimingEnabled: true,
    withdrawalStartTime: '09:00',
    withdrawalEndTime: '18:00',
    withdrawalAllowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    withdrawalTimezoneOffset: 5,
    withdrawalTimezoneName: 'PKT (UTC+5)',
    withdrawalClosedMessage: 'Withdrawals are currently closed. Requests are only accepted from 09:00 AM to 06:00 PM (Monday to Saturday) PKT.',
    withdrawalBoxes: [2, 4, 8, 10, 20, 30, 40, 50, 70, 100],
  };

  const auditLogs: AuditLog[] = [];

  return {
    users,
    balances,
    plans,
    userPlans,
    paymentMethods,
    deposits,
    withdrawals,
    transactions,
    promoCodes,
    promoRedemptions,
    teamMilestones,
    teamMilestoneClaims,
    salaryTiers,
    salaryPayouts,
    supportTickets,
    supportMessages,
    notifications,
    settings,
    auditLogs,
  };
}

class DatabaseService {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        let modified = false;

        if (!parsed.salaryTiers || parsed.salaryTiers.length === 0) {
          const fresh = createInitialSeed();
          parsed.salaryTiers = fresh.salaryTiers;
          modified = true;
        }

        if (!parsed.salaryPayouts) {
          parsed.salaryPayouts = [];
          modified = true;
        }

        if (!parsed.teamMilestones || parsed.teamMilestones.length === 0) {
          const fresh = createInitialSeed();
          parsed.teamMilestones = fresh.teamMilestones;
          modified = true;
        }

        if (!parsed.settings) {
          const fresh = createInitialSeed();
          parsed.settings = fresh.settings;
          modified = true;
        }

        if (!parsed.settings.usdToPkrRate) {
          parsed.settings.usdToPkrRate = 280.0;
          modified = true;
        }

        if (!parsed.settings.withdrawalBoxes || !Array.isArray(parsed.settings.withdrawalBoxes) || parsed.settings.withdrawalBoxes.length === 0) {
          parsed.settings.withdrawalBoxes = [2, 4, 8, 10, 20, 30, 40, 50, 70, 100];
          modified = true;
        }

        if (parsed.paymentMethods && Array.isArray(parsed.paymentMethods)) {
          parsed.paymentMethods.forEach((m) => {
            if (m.isActive === undefined) {
              m.isActive = m.status === 'active';
              modified = true;
            }
            if (!m.status) {
              m.status = m.isActive ? 'active' : 'inactive';
              modified = true;
            }
          });
        }

        const adminUser = parsed.users?.find((u) => u.username === 'admin');
        if (adminUser) {
          // If the admin password is still the old seed 'admin123' or not verified for abdullah, set to abdullah
          if (bcrypt.compareSync('admin123', adminUser.passwordHash) || !bcrypt.compareSync('abdullah', adminUser.passwordHash)) {
            // Check if it's not already changed to a custom password: if it matches admin123, change to abdullah
            if (bcrypt.compareSync('admin123', adminUser.passwordHash)) {
              adminUser.passwordHash = bcrypt.hashSync('abdullah', 10);
              modified = true;
            }
          }
        }

        if (modified) {
          this.saveDatabaseSync(parsed);
        }

        return parsed;
      }
    } catch (err) {
      console.error('Failed to read db.json, generating fresh seed:', err);
    }

    const seed = createInitialSeed();
    this.saveDatabaseSync(seed);
    return seed;
  }

  private saveDatabaseSync(data: DatabaseSchema) {
    try {
      this.ensureDataDirectory();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving db to disk:', err);
    }
  }

  public persist() {
    if (this.isSaving) return;
    this.isSaving = true;
    setTimeout(() => {
      this.saveDatabaseSync(this.data);
      this.isSaving = false;
    }, 50);
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // Atomic user balance helper
  public getUserBalance(userId: string): UserBalance {
    if (!this.data.balances[userId]) {
      this.data.balances[userId] = {
        userId,
        totalBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        todayEarnings: 0,
        totalEarnings: 0,
        availableWithdrawal: 0,
        referralCommission: 0,
        teamRewards: 0,
        promoRewards: 0,
      };
      this.persist();
    }
    return this.data.balances[userId];
  }

  public updateUserBalance(userId: string, updater: (bal: UserBalance) => void): UserBalance {
    const bal = this.getUserBalance(userId);
    updater(bal);
    this.persist();
    return bal;
  }

  // Auditable transaction creation
  public addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(newTx);
    this.persist();
    return newTx;
  }

  // Add system / user notification
  public addNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationItem['type']
  ): NotificationItem {
    const item: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.persist();
    return item;
  }

  // Add audit log
  public addAuditLog(
    adminId: string,
    adminName: string,
    action: string,
    targetType: string,
    targetId: string,
    details: string
  ): AuditLog {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminId,
      adminName,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    this.persist();
    return log;
  }
}

export const db = new DatabaseService();
