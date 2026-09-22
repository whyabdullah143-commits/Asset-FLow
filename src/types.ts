export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked' | 'inactive';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
  jazzcashNumber?: string;
  easypaisaNumber?: string;
  usdtAddress?: string;
  peakTeamCount?: number;
  unlockedSalaryTierId?: string;
}

export interface UserBalance {
  userId: string;
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  todayEarnings: number;
  totalEarnings: number;
  availableWithdrawal: number;
  referralCommission: number;
  teamRewards: number;
  promoRewards: number;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  badge: string;
  price: number;
  dailyRoiPercent: number;
  dailyIncome: number;
  validityDays: number;
  totalReturnPercent: number;
  minDeposit: number;
  features: string[];
  status: 'active' | 'inactive';
  isActive?: boolean;
  order: number;
  description?: string;
}

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  investedAmount: number;
  dailyIncome: number;
  totalEarned: number;
  startDate: string;
  expiryDate: string;
  lastClaimDate?: string;
  status: 'active' | 'completed' | 'expired';
  nextClaimTime?: string;
  canClaim?: boolean;
  remainingSeconds?: number;
}

export type PaymentType = 'crypto' | 'mobile_wallet' | 'bank';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType;
  accountTitle: string;
  accountNumber: string;
  currency?: string;
  networkOrBranch?: string;
  instructions: string;
  minDeposit: number;
  maxDeposit: number;
  feePercent: number;
  status: 'active' | 'inactive';
  isActive?: boolean;
  icon: string;
  order: number;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  methodId: string;
  methodName: string;
  amount: number;
  pkrAmount?: number;
  exchangeRate?: number;
  fee: number;
  netAmount: number;
  transactionRef: string;
  proofUrl?: string;
  status: DepositStatus;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  methodName: string;
  accountDetails: string;
  accountTitle?: string;
  accountNumber?: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: WithdrawalStatus;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'plan_activation'
  | 'daily_earning'
  | 'referral_commission'
  | 'team_reward'
  | 'promo_reward'
  | 'salary';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  type: TransactionType;
  amount: number;
  isCredit: boolean;
  balanceAfter: number;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  rewardAmount: number;
  maxUses: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'inactive' | 'exhausted';
  description?: string;
  createdAt: string;
}

export interface PromoRedemption {
  id: string;
  promoId: string;
  promoCode: string;
  userId: string;
  userName: string;
  rewardAmount: number;
  redeemedAt: string;
}

export interface TeamMilestone {
  id: string;
  title: string;
  requiredMembers: number;
  requiredActiveMembers?: number;
  rewardAmount: number;
  bonusReward?: number;
  condition: 'active_plan' | 'registered';
  status: 'active' | 'inactive';
  order: number;
  description?: string;
  isClaimed?: boolean;
}

export interface TeamMilestoneClaim {
  id: string;
  milestoneId: string;
  userId: string;
  rewardAmount: number;
  claimedAt: string;
}

export interface SalaryTier {
  id: string;
  title: string;
  requiredMembers: number;
  weeklySalary: number;
  condition: 'active_plan' | 'registered';
  status: 'active' | 'inactive';
  order: number;
  description?: string;
  currentMembers?: number;
  isQualified?: boolean;
  isPermanentlyUnlocked?: boolean;
}

export interface SalaryPayout {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tierId: string;
  tierTitle: string;
  weeklySalary: number;
  memberCount: number;
  claimedAt: string;
  nextClaimDate: string;
  status: 'paid' | 'approved';
  transactionRef?: string;
}

export interface ReferralMember {
  id: string;
  name: string;
  username: string;
  email: string;
  joinedAt: string;
  activePlan: string | null;
  hasActivePlan?: boolean;
  activePlanName?: string;
  totalDeposit: number;
  totalInvested?: number;
  commissionEarned?: number;
  status: 'active' | 'inactive';
  level: number;
}

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'answered' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface SupportTicket {
  id: string;
  ticketNo: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  messages?: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // userId or 'all' or 'admin'
  title: string;
  message: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'plan' | 'referral' | 'promo' | 'system' | 'support' | string;
  read: boolean;
  isRead?: boolean;
  createdAt: string;
}

export type Notification = NotificationItem;

export interface PlatformSettings {
  siteName: string;
  tagline?: string;
  currency: string;
  currencySymbol: string;
  usdToPkrRate?: number;
  referralCommissionPercent: number;
  referralBonusPercent?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFeePercent: number;
  dailyEarningCycleHours: number;
  supportEmail: string;
  supportPhone?: string;
  supportWhatsApp?: string;
  supportTelegram?: string;
  maintenanceMode: boolean;
  announcementText: string;
  showAnnouncement?: boolean;
  // Withdrawal window & schedule timings
  withdrawalTimingEnabled?: boolean;
  withdrawalStartTime?: string;
  withdrawalEndTime?: string;
  withdrawalAllowedDays?: string[];
  withdrawalTimezoneOffset?: number;
  withdrawalTimezoneName?: string;
  withdrawalClosedMessage?: string;
  withdrawalBoxes?: number[];
}

export type SystemSettings = PlatformSettings;

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminUsername?: string;
  action: string;
  targetType: string;
  targetId: string;
  targetUser?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activePlansCount: number;
  pendingDepositsCount: number;
  pendingDeposits?: number;
  totalDeposits?: number;
  approvedDepositsTotal: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawals?: number;
  totalWithdrawals?: number;
  completedWithdrawalsTotal: number;
  totalEarningsDistributed: number;
  totalReferralCommission: number;
  totalPromoRedemptions: number;
  openSupportTickets: number;
  systemBalance: number;
  platformReserve?: number;
}
