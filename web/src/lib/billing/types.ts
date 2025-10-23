export type AccountFeatures = {
  account_id: string;
  plan: string;
  status: string;
  is_paid: boolean;
  monthly_liveblog_limit: number | null;
  can_manage_sponsors: boolean;
  can_manage_editors: boolean;
  can_use_premium_themes: boolean;
  can_use_webhooks: boolean;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
};

