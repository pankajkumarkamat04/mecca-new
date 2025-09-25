'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlayIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const HelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Categories', icon: BookOpenIcon },
    { id: 'getting-started', name: 'Getting Started', icon: PlayIcon },
    { id: 'pos-system', name: 'POS System', icon: CheckCircleIcon },
    { id: 'inventory', name: 'Inventory Management', icon: DocumentTextIcon },
    { id: 'customers', name: 'Customer Management', icon: InformationCircleIcon },
    { id: 'reports', name: 'Reports & Analytics', icon: BookOpenIcon },
    { id: 'billing', name: 'Billing & Payments', icon: CheckCircleIcon },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: ExclamationTriangleIcon },
  ];

  const articles = [
    {
      id: 'getting-started-1',
      title: 'Welcome to Mecca POS System',
      category: 'getting-started',
      content: 'Learn the basics of using the Mecca POS system to manage your business effectively.',
      tags: ['basics', 'introduction', 'overview'],
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: 'pos-system-1',
      title: 'Processing Sales Transactions',
      category: 'pos-system',
      content: 'Complete guide on how to process sales, handle payments, and generate receipts.',
      tags: ['sales', 'transactions', 'payments'],
      updatedAt: new Date('2024-12-13'),
    },
    {
      id: 'pos-system-2',
      title: 'Managing POS Registers',
      category: 'pos-system',
      content: 'Learn how to open, close, and manage multiple POS registers for your employees.',
      tags: ['registers', 'employees', 'management'],
      updatedAt: new Date('2024-12-12'),
    },
    {
      id: 'inventory-1',
      title: 'Adding and Managing Products',
      category: 'inventory',
      content: 'How to add new products, manage inventory levels, and track stock movements.',
      tags: ['products', 'inventory', 'stock'],
      updatedAt: new Date('2024-12-11'),
    },
    {
      id: 'inventory-2',
      title: 'Stock Alerts and Low Stock Management',
      category: 'inventory',
      content: 'Set up automatic alerts for low stock levels and manage reorder points.',
      tags: ['alerts', 'low stock', 'reorder'],
      updatedAt: new Date('2024-12-10'),
    },
    {
      id: 'customers-1',
      title: 'Customer Management Basics',
      category: 'customers',
      content: 'Create customer profiles, manage customer accounts, and track customer history.',
      tags: ['customers', 'profiles', 'accounts'],
      updatedAt: new Date('2024-12-09'),
    },
    {
      id: 'reports-1',
      title: 'Generating Sales Reports',
      category: 'reports',
      content: 'Create and customize sales reports, analyze performance, and export data.',
      tags: ['reports', 'sales', 'analytics'],
      updatedAt: new Date('2024-12-08'),
    },
    {
      id: 'billing-1',
      title: 'Payment Gateway Setup',
      category: 'billing',
      content: 'Configure payment gateways, process online payments, and manage billing.',
      tags: ['payments', 'gateway', 'billing'],
      updatedAt: new Date('2024-12-07'),
    },
    {
      id: 'troubleshooting-1',
      title: 'Common Issues and Solutions',
      category: 'troubleshooting',
      content: 'Troubleshoot common issues, error messages, and system problems.',
      tags: ['troubleshooting', 'errors', 'solutions'],
      updatedAt: new Date('2024-12-06'),
    },
  ];

  const faqs = [
    {
      question: 'How do I add a new product to my inventory?',
      answer: 'To add a new product, go to the Products page, click "Add Product", fill in the product details including name, SKU, price, and stock quantity, then save.',
    },
    {
      question: 'Can I process refunds through the POS system?',
      answer: 'Yes, you can process refunds by finding the original transaction, selecting the items to refund, and choosing the refund method.',
    },
    {
      question: 'What payment methods are supported?',
      answer: 'The system supports cash, credit/debit cards, digital wallets, and online payment gateways like Stripe and PayPal.',
    },
    {
      question: 'How can I generate custom reports?',
      answer: 'Go to the Reports section, select the report type, choose your date range and filters, then click Generate Report.',
    },
    
  ];

  const contactMethods = [
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      action: 'Start Chat',
      available: '24/7',
    },
    {
      icon: PhoneIcon,
      title: 'Phone Support',
      description: 'Call us for immediate assistance',
      action: '+1 (555) 123-4567',
      available: 'Mon-Fri 9AM-6PM EST',
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      action: 'support@meccapos.com',
      available: '24/7',
    },
  ];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : BookOpenIcon;
  };

  return (
    <Layout title="Help & Support">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-gray-600">Find answers to your questions and get the help you need</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search for help articles, FAQs, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  fullWidth
                />
              </div>
            </div>
            <Button>
              Search
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <category.icon className="h-5 w-5 mr-3" />
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Contact */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Need More Help?</h3>
              <div className="space-y-3">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <method.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{method.title}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{method.available}</p>
                      <button className="text-sm text-blue-600 hover:text-blue-800 mt-1">
                        {method.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedArticle ? (
              /* Article View */
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    ← Back to articles
                  </button>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {articles.find(a => a.id === selectedArticle)?.title}
                  </h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-600">
                      {articles.find(a => a.id === selectedArticle)?.content}
                    </p>
                    {/* Article content would be expanded here */}
                  </div>
                </div>
              </div>
            ) : (
              /* Articles List */
              <div className="space-y-6">
                {/* Popular Articles */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Getting Started with POS</h4>
                      <p className="text-sm text-gray-600 mt-1">Learn the basics of processing sales</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Managing Inventory</h4>
                      <p className="text-sm text-gray-600 mt-1">Add products and track stock levels</p>
                    </div>
                  </div>
                </div>

                {/* Articles List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedCategory === 'all' ? 'All Articles' : categories.find(c => c.id === selectedCategory)?.name}
                      <span className="ml-2 text-sm text-gray-500">({filteredArticles.length})</span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article.id)}
                        className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {React.createElement(getCategoryIcon(article.category), {
                                className: "h-4 w-4 text-gray-400"
                              })}
                              <span className="text-xs text-gray-500 uppercase">
                                {categories.find(c => c.id === article.category)?.name}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{article.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{article.content}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Updated {formatDate(article.updatedAt)}</span>
                              <div className="flex space-x-1">
                                {article.tags.map((tag, index) => (
                                  <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-start">
                          <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          {faq.question}
                        </h4>
                        <p className="text-sm text-gray-600 ml-7">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HelpPage;
