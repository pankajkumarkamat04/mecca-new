export interface CustomerInquiry {
  _id: string;
  inquiryNumber: string;
  customer: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    customerCode?: string;
    address?: any;
  };
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  subject: string;
  message: string;
  inquiryDate: string;
  status: 'new' | 'pending' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  productsOfInterest: Array<{
    product: string | {
      _id: string;
      name: string;
      sku: string;
      description?: string;
      pricing?: any;
      inventory?: any;
    };
    quantity?: number;
    notes?: string;
  }>;
  notes?: string;
  followUpDate?: string;
  resolutionDate?: string;
  convertedToQuotation?: string | {
    _id: string;
    quotationNumber: string;
    status: string;
    totalAmount?: number;
  };
  convertedToOrder?: string | {
    _id: string;
    orderNumber: string;
    orderStatus: string;
    totalAmount?: number;
  };
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInquiryStats {
  total: number;
  byStatus: {
    new: number;
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  conversionRate: number;
  overdue: number;
  byPriority: {
    urgent: number;
    high: number;
  };
}

export interface CreateCustomerInquiryData {
  customer: string;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  productsOfInterest?: Array<{
    product: string;
    quantity?: number;
    notes?: string;
  }>;
  notes?: string;
  followUpDate?: string;
}

export interface UpdateCustomerInquiryData extends Partial<CreateCustomerInquiryData> {
  status?: 'new' | 'pending' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  assignedTo?: string;
}

export interface CustomerInquiryFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}
