
import { Service, Account, Client, Sale, FinancialAccount, Movement, Reseller, Provider, PayableExpense, Expense, SupplyPurchase, ActivityLog, ProfileHistoryEntry, ExpenseCategory, ServiceFailure, AppSettings } from '../types';

export const mappers = {
  serviceFailure: {
    fromDb: (d: any): ServiceFailure => ({
      id: d.id,
      userId: d.user_id,
      saleId: d.sale_id,
      notes: d.notes,
      createdAt: d.created_at
    }),
    toDb: (f: ServiceFailure, userId: string) => ({
      id: f.id,
      user_id: userId,
      sale_id: f.saleId,
      notes: f.notes,
      created_at: f.createdAt
    })
  },
  service: {
    fromDb: (d: any): Service => ({
      id: d.id,
      name: d.name,
      cost: d.cost,
      screens: d.screens,
      type: d.type,
      investmentPrice: d.investment_price,
      publicPrice: d.public_price,
      resellerPrice: d.reseller_price,
      image_url: d.image_url
    }),
    toDb: (s: Service, userId: string) => ({
      id: s.id,
      user_id: userId,
      name: s.name,
      cost: s.cost,
      screens: s.screens,
      type: s.type,
      investment_price: s.investmentPrice,
      public_price: s.publicPrice,
      reseller_price: s.resellerPrice,
      image_url: s.image_url
    })
  },
  account: {
    fromDb: (d: any): Account => ({ 
      id: d.id, 
      serviceId: d.service_id, 
      email: d.email, 
      password: d.password, 
      country: d.country, 
      startDate: d.start_date, 
      endDate: d.end_date, 
      status: d.status, 
      notes: d.notes, 
      maxScreens: d.max_screens, 
      usedScreens: d.used_screens, 
      profiles: Array.isArray(d.profiles) ? d.profiles : [], 
      plan: d.plan, 
      account_type: d.account_type, 
      providerId: d.provider_id, 
      autoRenewal: d.auto_renewal,
      failure_started_at: d.failure_started_at,
      health_status: d.health_status,
      is_down: d.is_down,
      down_at: d.down_at,
      down_reason: d.down_reason
    }),
    toDb: (a: Account, userId: string) => ({ 
      id: a.id, 
      user_id: userId, 
      service_id: a.serviceId, 
      email: a.email, 
      password: a.password, 
      country: a.country || null, 
      start_date: a.startDate, 
      end_date: a.endDate, 
      status: a.status, 
      notes: a.notes || null, 
      max_screens: a.maxScreens, 
      used_screens: a.usedScreens || 0, 
      profiles: Array.isArray(a.profiles) ? a.profiles : [], 
      plan: a.plan || null, 
      account_type: a.account_type, 
      provider_id: a.providerId || null, 
      auto_renewal: !!a.autoRenewal,
      failure_started_at: a.failure_started_at || null,
      health_status: a.health_status || 'good',
      is_down: !!a.is_down,
      down_at: a.down_at || null,
      down_reason: a.down_reason || null
    })
  },
  client: {
    fromDb: (d: any): Client => ({
      id: d.id,
      name: d.name,
      phone: d.phone || '',
      telegram: d.telegram || '',
      registrationDate: d.registration_date,
      activeServices: d.active_services || 0,
      notes: d.notes || '',
      resellerId: d.reseller_id,
      tags: d.tags || [],
      isBlocked: d.is_blocked || false,
      portalAlias: d.portal_alias,
      portalPin: d.portal_pin,
      originalName: d.original_name,
      originalPhone: d.original_phone,
      slug: d.portal_slug,
      portalToken: d.portal_token,
      portal_pin_hash: d.portal_pin_hash,
      loyalty_points: d.loyalty_points || d.points || 0
    }),
    toDb: (c: Client, userId: string) => ({
      id: c.id,
      user_id: userId,
      name: c.name.trim(),
      phone: c.phone || null,
      telegram: c.telegram || null,
      registration_date: c.registrationDate || new Date().toISOString().split('T')[0],
      active_services: c.activeServices || 0,
      notes: c.notes || null,
      reseller_id: c.resellerId || null,
      tags: c.tags || [],
      is_blocked: !!c.isBlocked,
      portal_alias: c.portalAlias || null,
      portal_pin: c.portalPin || null,
      original_name: c.originalName || c.name.trim(),
      original_phone: c.originalPhone || null,
      portal_slug: c.slug || null,
      portal_token: c.portalToken || null,
      portal_pin_hash: (c as any).portal_pin_hash || null,
      loyalty_points: (c as any).loyalty_points || 0
    })
  },
  sale: {
    fromDb: (d: any): Sale => ({
      id: d.id,
      clientId: d.client_id,
      accountId: d.account_id,
      serviceName: d.service_name,
      saleType: d.sale_type,
      amount: d.amount,
      date: d.date,
      expiryDate: d.expiry_date,
      screensCount: d.screens_count,
      assignedProfiles: d.assigned_profiles,
      exchangeRate: d.exchange_rate,
      isPartial: d.is_partial,
      initialPayment: d.initial_payment,
      invitedEmail: d.invited_email,
      invitedPassword: d.invited_password,
      resellerId: d.reseller_id,
      notes: d.notes,
      investment_cost: d.investment_cost || d.cost || 0
    }),
    toDb: (s: Sale, userId: string) => ({
      id: s.id,
      user_id: userId,
      client_id: s.clientId,
      account_id: s.accountId,
      service_name: s.serviceName,
      sale_type: s.saleType,
      amount: s.amount,
      date: s.date,
      expiry_date: s.expiryDate,
      screens_count: s.screensCount || 1,
      assigned_profiles: s.assignedProfiles || [],
      exchange_rate: s.exchangeRate || 1,
      is_partial: !!s.isPartial,
      initial_payment: s.initialPayment || 0,
      invited_email: s.invitedEmail || null,
      invited_password: s.invitedPassword || null,
      reseller_id: s.resellerId || null,
      notes: s.notes || null
    })
  },
  financial: {
    fromDb: (d: any): FinancialAccount => ({
      id: d.id,
      name: d.name,
      currency: d.currency,
      balance: d.balance,
      paymentMethods: d.payment_methods || [],
      isActive: d.is_active
    }),
    toDb: (f: FinancialAccount, userId: string) => ({
      id: f.id,
      user_id: userId,
      name: f.name,
      currency: f.currency,
      balance: f.balance,
      payment_methods: f.paymentMethods,
      is_active: f.isActive ?? true
    })
  },
  movement: {
    fromDb: (d: any): Movement => ({
      id: d.id,
      accountId: d.account_id,
      relatedAccountId: d.related_account_id,
      type: d.type,
      amount: d.amount,
      currency: d.currency,
      exchangeRate: d.exchange_rate,
      usdEquivalent: d.usd_equivalent,
      date: d.date,
      description: d.description,
      paymentMethod: d.payment_method,
      reconciled: d.reconciled,
      reconciled_at: d.reconciled_at,
      reconciled_by: d.reconciled_by,
      verified: d.verified
    }),
    toDb: (m: Movement, userId: string) => ({
      id: m.id,
      user_id: userId,
      account_id: m.accountId,
      related_account_id: m.relatedAccountId || null,
      type: m.type,
      amount: m.amount,
      currency: m.currency,
      exchange_rate: m.exchangeRate || 1,
      usd_equivalent: m.usdEquivalent || 0,
      date: m.date,
      description: m.description || null,
      payment_method: m.paymentMethod || null,
      reconciled: !!m.reconciled,
      reconciled_at: m.reconciled_at || null,
      reconciled_by: m.reconciled_by || null,
      verified: !!m.verified
    })
  },
  reseller: {
    fromDb: (d: any): Reseller => ({
      id: d.id,
      name: d.name,
      code: d.code,
      whatsapp: d.whatsapp,
      telegram: d.telegram,
      color: d.color,
      registrationDate: d.registration_date
    }),
    toDb: (r: Reseller, userId: string) => ({
      id: r.id,
      user_id: userId,
      name: r.name,
      code: r.code,
      whatsapp: r.whatsapp,
      telegram: r.telegram || null,
      color: r.color,
      registration_date: r.registrationDate
    })
  },
  provider: {
    fromDb: (d: any): Provider => ({
      id: d.id,
      name: d.name,
      whatsapp: d.whatsapp,
      telegram: d.telegram,
      color: d.color,
      registrationDate: d.registration_date,
      qualityScore: d.quality_score
    }),
    toDb: (p: Provider, userId: string) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      whatsapp: p.whatsapp,
      telegram: p.telegram || null,
      color: p.color,
      registration_date: p.registrationDate,
      quality_score: p.qualityScore || 5
    })
  },
  payable: {
    fromDb: (d: any): PayableExpense => ({
      id: d.id,
      name: d.name,
      amount: d.amount,
      currency: d.currency,
      dueDate: d.due_date,
      recurrence: d.recurrence
    }),
    toDb: (p: PayableExpense, userId: string) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      due_date: p.dueDate,
      recurrence: p.recurrence || null
    })
  },
  expense: {
    fromDb: (d: any): Expense => ({
      id: d.id,
      userId: d.user_id,
      date: d.date,
      amount: d.amount,
      exchangeRate: d.exchange_rate,
      category: d.category,
      categoryId: d.category_id,
      description: d.description,
      paymentMethod: d.payment_method,
      financialAccountId: d.financial_account_id,
      createdAt: d.created_at
    }),
    toDb: (e: Expense, userId: string) => ({
      id: e.id,
      user_id: userId,
      date: e.date,
      amount: e.amount,
      exchange_rate: e.exchangeRate || 1,
      category: e.category,
      category_id: e.categoryId || null,
      description: e.description || null,
      payment_method: e.paymentMethod,
      financial_account_id: e.financialAccountId || null,
      created_at: e.createdAt
    })
  },
  supply: {
    fromDb: (d: any): SupplyPurchase => ({
      id: d.id,
      userId: d.user_id,
      providerName: d.provider_name,
      itemType: d.item_type,
      label: d.label,
      quantity: d.quantity,
      unitCost: d.unit_cost,
      totalCost: d.total_cost,
      exchangeRate: d.exchange_rate,
      date: d.date,
      paymentMethod: d.payment_method,
      financialAccountId: d.financial_account_id,
      createdAt: d.created_at
    }),
    toDb: (s: SupplyPurchase, userId: string) => ({
      id: s.id,
      user_id: userId,
      provider_name: s.providerName || null,
      item_type: s.itemType,
      label: s.label,
      quantity: s.quantity,
      unit_cost: s.unitCost,
      total_cost: s.totalCost,
      exchange_rate: s.exchangeRate || 1,
      date: s.date,
      payment_method: s.paymentMethod,
      financial_account_id: s.financialAccountId || null,
      created_at: s.createdAt
    })
  },
  expenseCategory: {
    fromDb: (d: any): ExpenseCategory => ({
      id: d.id,
      name: d.name,
      color: d.color
    }),
    toDb: (c: ExpenseCategory, userId: string) => ({
      id: c.id,
      user_id: userId,
      name: c.name,
      color: c.color
    })
  },
  log: {
    fromDb: (d: any): ActivityLog => ({
      id: d.id,
      user_id: d.user_id,
      action: d.action,
      entity: d.entity,
      details: d.details,
      timestamp: d.timestamp
    }),
    toDb: (l: ActivityLog, userId: string) => ({
      id: l.id,
      user_id: userId,
      action: l.action,
      entity: l.entity,
      details: l.details,
      timestamp: l.timestamp,
      created_at: l.timestamp // many tables use created_at as serial time
    })
  },
  settings: {
    fromDb: (d: any): AppSettings => ({
      currency: d.currency,
      subCurrency: d.sub_currency,
      exchangeRate: d.exchange_rate,
      messageTemplates: d.message_templates,
      telegramMessageTemplates: d.telegram_message_templates,
      salesPreferences: d.sales_preferences,
      analyticsPreferences: d.analytics_preferences,
      notificationPreferences: d.notification_preferences,
      digestSettings: d.digest_settings,
      businessInfo: d.business_info,
      useBusinessLogo: d.use_business_logo,
      dashboardWidgets: d.dashboard_widgets,
      theme: d.theme,
      backupPreferences: d.backup_preferences
    }),
    toDb: (s: AppSettings, userId: string) => ({
      user_id: userId,
      currency: s.currency,
      sub_currency: s.subCurrency,
      exchange_rate: s.exchangeRate,
      message_templates: s.messageTemplates,
      telegram_message_templates: s.telegramMessageTemplates,
      sales_preferences: s.salesPreferences,
      analytics_preferences: s.analyticsPreferences,
      notification_preferences: s.notificationPreferences,
      digest_settings: s.digestSettings,
      business_info: s.businessInfo,
      use_business_logo: !!s.useBusinessLogo,
      dashboard_widgets: s.dashboardWidgets,
      theme: s.theme,
      backup_preferences: s.backupPreferences
    })
  },
  profileHistory: {
    fromDb: (d: any): ProfileHistoryEntry => ({
      id: d.id,
      userId: d.user_id,
      accountId: d.account_id,
      profileName: d.profile_name,
      clientName: d.client_name,
      pin: d.pin,
      actionType: d.action_type,
      createdAt: d.created_at,
      notes: d.notes
    }),
    toDb: (h: ProfileHistoryEntry, userId: string) => ({
      id: h.id,
      user_id: userId,
      account_id: h.accountId,
      profile_name: h.profileName,
      client_name: h.clientName,
      pin: h.pin,
      action_type: h.actionType,
      created_at: h.createdAt,
      notes: h.notes || null
    })
  }
};
