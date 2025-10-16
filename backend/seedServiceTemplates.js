const mongoose = require('mongoose');
const ServiceTemplate = require('./models/ServiceTemplate');
require('dotenv').config();

const sampleServiceTemplates = [
  {
    name: 'Engine Overhaul',
    description: 'Complete engine rebuild including piston rings, bearings, and gaskets',
    category: 'engine',
    estimatedDuration: 480, // 8 hours
    estimatedCost: 2500,
    priority: 'high',
    requiredTools: [
      { name: 'Engine Hoist', quantity: 1, optional: false },
      { name: 'Torque Wrench', quantity: 1, optional: false },
      { name: 'Piston Ring Compressor', quantity: 1, optional: false },
      { name: 'Engine Stand', quantity: 1, optional: false }
    ],
    requiredParts: [
      { name: 'Piston Rings', quantity: 4, optional: false },
      { name: 'Main Bearings', quantity: 5, optional: false },
      { name: 'Rod Bearings', quantity: 4, optional: false },
      { name: 'Head Gasket', quantity: 1, optional: false },
      { name: 'Oil Filter', quantity: 1, optional: false },
      { name: 'Engine Oil', quantity: 5, optional: false }
    ],
    tasks: [
      { name: 'Remove Engine', description: 'Disconnect all connections and remove engine from vehicle', estimatedDuration: 120, order: 1, required: true },
      { name: 'Disassemble Engine', description: 'Remove cylinder head, pistons, and crankshaft', estimatedDuration: 90, order: 2, required: true },
      { name: 'Inspect Components', description: 'Check all components for wear and damage', estimatedDuration: 60, order: 3, required: true },
      { name: 'Replace Bearings', description: 'Install new main and rod bearings', estimatedDuration: 60, order: 4, required: true },
      { name: 'Install Pistons', description: 'Install pistons with new rings', estimatedDuration: 90, order: 5, required: true },
      { name: 'Reassemble Engine', description: 'Reassemble engine components', estimatedDuration: 120, order: 6, required: true },
      { name: 'Install Engine', description: 'Install engine back into vehicle', estimatedDuration: 120, order: 7, required: true },
      { name: 'Test and Adjust', description: 'Start engine and perform adjustments', estimatedDuration: 30, order: 8, required: true }
    ],
    notes: 'Ensure proper torque specifications are followed. Check for any additional damage during disassembly.'
  },
  {
    name: 'Brake Service',
    description: 'Complete brake system inspection and maintenance',
    category: 'brakes',
    estimatedDuration: 120, // 2 hours
    estimatedCost: 300,
    priority: 'medium',
    requiredTools: [
      { name: 'Brake Bleeder Kit', quantity: 1, optional: false },
      { name: 'C-Clamp', quantity: 1, optional: false },
      { name: 'Brake Fluid Tester', quantity: 1, optional: true }
    ],
    requiredParts: [
      { name: 'Brake Pads', quantity: 4, optional: false },
      { name: 'Brake Fluid', quantity: 1, optional: false },
      { name: 'Brake Cleaner', quantity: 2, optional: false }
    ],
    tasks: [
      { name: 'Remove Wheels', description: 'Remove all four wheels', estimatedDuration: 15, order: 1, required: true },
      { name: 'Inspect Brake System', description: 'Check pads, rotors, and fluid levels', estimatedDuration: 20, order: 2, required: true },
      { name: 'Replace Brake Pads', description: 'Replace worn brake pads', estimatedDuration: 45, order: 3, required: true },
      { name: 'Bleed Brake System', description: 'Bleed air from brake lines', estimatedDuration: 30, order: 4, required: true },
      { name: 'Test Brakes', description: 'Test brake operation and adjust if needed', estimatedDuration: 10, order: 5, required: true }
    ],
    notes: 'Check brake fluid level and condition. Inspect brake lines for leaks.'
  },
  {
    name: 'Suspension Repair',
    description: 'Replace worn suspension components',
    category: 'suspension',
    estimatedDuration: 180, // 3 hours
    estimatedCost: 800,
    priority: 'medium',
    requiredTools: [
      { name: 'Spring Compressor', quantity: 1, optional: false },
      { name: 'Ball Joint Separator', quantity: 1, optional: false },
      { name: 'Torque Wrench', quantity: 1, optional: false }
    ],
    requiredParts: [
      { name: 'Shock Absorbers', quantity: 4, optional: false },
      { name: 'Strut Mounts', quantity: 2, optional: false },
      { name: 'Control Arm Bushings', quantity: 4, optional: false }
    ],
    tasks: [
      { name: 'Remove Old Components', description: 'Remove worn suspension components', estimatedDuration: 60, order: 1, required: true },
      { name: 'Install New Shocks', description: 'Install new shock absorbers', estimatedDuration: 45, order: 2, required: true },
      { name: 'Replace Bushings', description: 'Replace control arm bushings', estimatedDuration: 45, order: 3, required: true },
      { name: 'Align Wheels', description: 'Perform wheel alignment', estimatedDuration: 30, order: 4, required: true }
    ],
    notes: 'Check for additional worn components. Perform wheel alignment after installation.'
  },
  {
    name: 'Transmission Service',
    description: 'Transmission fluid change and filter replacement',
    category: 'transmission',
    estimatedDuration: 90, // 1.5 hours
    estimatedCost: 200,
    priority: 'medium',
    requiredTools: [
      { name: 'Transmission Jack', quantity: 1, optional: false },
      { name: 'Drain Pan', quantity: 1, optional: false }
    ],
    requiredParts: [
      { name: 'Transmission Fluid', quantity: 4, optional: false },
      { name: 'Transmission Filter', quantity: 1, optional: false },
      { name: 'Pan Gasket', quantity: 1, optional: false }
    ],
    tasks: [
      { name: 'Drain Fluid', description: 'Drain old transmission fluid', estimatedDuration: 20, order: 1, required: true },
      { name: 'Remove Pan', description: 'Remove transmission pan', estimatedDuration: 15, order: 2, required: true },
      { name: 'Replace Filter', description: 'Replace transmission filter', estimatedDuration: 20, order: 3, required: true },
      { name: 'Install Pan', description: 'Install pan with new gasket', estimatedDuration: 15, order: 4, required: true },
      { name: 'Add Fluid', description: 'Add new transmission fluid', estimatedDuration: 20, order: 5, required: true }
    ],
    notes: 'Check transmission for leaks after service. Test drive to ensure proper operation.'
  },
  {
    name: 'Electrical Diagnosis',
    description: 'Diagnose and repair electrical system issues',
    category: 'electrical',
    estimatedDuration: 120, // 2 hours
    estimatedCost: 150,
    priority: 'high',
    requiredTools: [
      { name: 'Multimeter', quantity: 1, optional: false },
      { name: 'Test Light', quantity: 1, optional: false },
      { name: 'Wire Strippers', quantity: 1, optional: false }
    ],
    requiredParts: [
      { name: 'Electrical Wire', quantity: 10, optional: true },
      { name: 'Connectors', quantity: 20, optional: true },
      { name: 'Fuses', quantity: 10, optional: true }
    ],
    tasks: [
      { name: 'Diagnose Issue', description: 'Identify electrical problem', estimatedDuration: 45, order: 1, required: true },
      { name: 'Test Circuits', description: 'Test affected circuits', estimatedDuration: 30, order: 2, required: true },
      { name: 'Repair Wiring', description: 'Repair or replace damaged wiring', estimatedDuration: 30, order: 3, required: true },
      { name: 'Test Repair', description: 'Test repaired circuits', estimatedDuration: 15, order: 4, required: true }
    ],
    notes: 'Document all findings and repairs. Check for additional electrical issues.'
  }
];

async function seedServiceTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mecca');
    console.log('Connected to MongoDB');

    // Clear existing service templates
    await ServiceTemplate.deleteMany({});
    console.log('Cleared existing service templates');

    // Create sample service templates
    for (const templateData of sampleServiceTemplates) {
      const template = new ServiceTemplate({
        ...templateData,
        createdBy: new mongoose.Types.ObjectId() // Use a dummy ObjectId for seeding
      });
      await template.save();
      console.log(`Created service template: ${template.name}`);
    }

    console.log('Service templates seeded successfully');
  } catch (error) {
    console.error('Error seeding service templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedServiceTemplates();
}

module.exports = { seedServiceTemplates };
