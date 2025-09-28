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
  description: string;
  inquiryDate: string;
  status: 'new' | 'under_review' | 'quoted' | 'converted_to_order' | 'closed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  items: Array<{
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
  internalNotes?: string;
  followUpDate?: string;
  resolutionDate?: string;
  quotation?: string | {
    _id: string;
    quotationNumber: string;
    status: string;
    totalAmount?: number;
  };
  order?: string | {
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
    under_review: number;
    quoted: number;
    converted_to_order: number;
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
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  items?: Array<{
    product: string;
    quantity?: number;
    notes?: string;
  }>;
  internalNotes?: string;
  followUpDate?: string;
}

export interface UpdateCustomerInquiryData extends Partial<CreateCustomerInquiryData> {
  status?: 'new' | 'under_review' | 'quoted' | 'converted_to_order' | 'closed' | 'cancelled';
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
