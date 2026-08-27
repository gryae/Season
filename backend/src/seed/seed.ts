import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // DEFAULT USER
  // ============================================
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created default admin user (admin/admin123)');

  console.log('🌱 Seeding SeaSon database...');

  // ============================================================
  // VESSELS
  // ============================================================
  const vessel1 = await prisma.vessel.upsert({
    where: { imoNumber: 'IMO9876543' },
    update: {},
    create: {
      name: 'MV Majestic Dawn',
      imoNumber: 'IMO9876543',
      vesselType: 'Bulk Carrier',
      flag: 'Singapore',
      currentRunHours: 4850,
      status: 'ACTIVE',
    },
  });

  const vessel2 = await prisma.vessel.upsert({
    where: { imoNumber: 'IMO1234567' },
    update: {},
    create: {
      name: 'MV Ocean Pioneer',
      imoNumber: 'IMO1234567',
      vesselType: 'Container Ship',
      flag: 'Malaysia',
      currentRunHours: 3200,
      status: 'ACTIVE',
    },
  });

  const vessel3 = await prisma.vessel.upsert({
    where: { imoNumber: 'IMO5555999' },
    update: {},
    create: {
      name: 'MT Horizon Star',
      imoNumber: 'IMO5555999',
      vesselType: 'Oil Tanker',
      flag: 'Indonesia',
      currentRunHours: 6100,
      status: 'DOCKED',
    },
  });

  console.log(`✅ Vessels created: ${vessel1.name}, ${vessel2.name}, ${vessel3.name}`);

  // ============================================================
  // INITIAL GPS TELEMETRY
  // ============================================================
  await prisma.telemetry.createMany({
    data: [
      { vesselId: vessel1.id, latitude: 1.2655, longitude: 103.8201, speed: 12.5, heading: 45, runHours: 4850 },
      { vesselId: vessel2.id, latitude: 3.1390, longitude: 101.6869, speed: 9.2, heading: 180, runHours: 3200 },
      { vesselId: vessel3.id, latitude: 5.4141, longitude: 100.3288, speed: 0, heading: 270, runHours: 6100 },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // MAINTENANCE SCHEDULES
  // ============================================================
  await prisma.maintenanceSchedule.createMany({
    data: [
      // Vessel 1
      { vesselId: vessel1.id, taskName: 'Main Engine Oil Change', description: 'Drain and replace main engine lubricating oil. Check filters.', intervalRunHours: 500, targetRunHours: 5000 },
      { vesselId: vessel1.id, taskName: 'Fuel Filter Replacement', description: 'Replace primary and secondary fuel filters.', intervalRunHours: 250, targetRunHours: 4900 },
      { vesselId: vessel1.id, taskName: 'Generator Overhaul', description: 'Full inspection and overhaul of auxiliary generator.', intervalRunHours: 1000, targetRunHours: 5500 },
      // Vessel 2
      { vesselId: vessel2.id, taskName: 'Propeller Shaft Inspection', description: 'Visual and measurement inspection of propeller shaft seals and bearing.', intervalRunHours: 500, targetRunHours: 3500 },
      { vesselId: vessel2.id, taskName: 'Cooling Water System Service', description: 'Clean sea water cooling system, check zinc anodes.', intervalRunHours: 300, targetRunHours: 3400 },
      // Vessel 3
      { vesselId: vessel3.id, taskName: 'Cargo Pump Maintenance', description: 'Full overhaul of main cargo transfer pump.', intervalRunHours: 750, targetRunHours: 6200 },
      { vesselId: vessel3.id, taskName: 'Hydraulic System Check', description: 'Check hydraulic fluid levels, seals, and pressure readings.', intervalRunHours: 200, targetRunHours: 6150 },
    ],
    skipDuplicates: false,
  });

  console.log('✅ Maintenance schedules created');

  // ============================================================
  // SPAREPARTS
  // ============================================================
  const spareparts = [
    { partNumber: 'SP-ENG-001', name: 'Engine Oil Filter (Main)', category: 'Engine', unit: 'pcs', currentStock: 8, minimumStockLevel: 5, unitPrice: 245.00, location: 'Store A-1' },
    { partNumber: 'SP-ENG-002', name: 'Fuel Injection Nozzle', category: 'Engine', unit: 'pcs', currentStock: 3, minimumStockLevel: 4, unitPrice: 1850.00, location: 'Store A-2' },
    { partNumber: 'SP-HYD-001', name: 'Hydraulic Seal Kit', category: 'Hydraulics', unit: 'set', currentStock: 12, minimumStockLevel: 3, unitPrice: 380.00, location: 'Store B-1' },
    { partNumber: 'SP-ELE-001', name: 'Alternator Belt V-Type', category: 'Electrical', unit: 'pcs', currentStock: 6, minimumStockLevel: 4, unitPrice: 95.00, location: 'Store C-1' },
    { partNumber: 'SP-SAF-001', name: 'Fire Extinguisher CO2 5kg', category: 'Safety', unit: 'pcs', currentStock: 20, minimumStockLevel: 10, unitPrice: 125.00, location: 'Safety Locker' },
    { partNumber: 'SP-PMP-001', name: 'Centrifugal Pump Impeller', category: 'Pumps', unit: 'pcs', currentStock: 2, minimumStockLevel: 3, unitPrice: 2200.00, location: 'Store D-1' },
    { partNumber: 'SP-ENG-003', name: 'Piston Ring Set (Main Engine)', category: 'Engine', unit: 'set', currentStock: 4, minimumStockLevel: 2, unitPrice: 4500.00, location: 'Store A-3' },
  ];

  for (const sp of spareparts) {
    await prisma.sparepart.upsert({
      where: { partNumber: sp.partNumber },
      update: {},
      create: sp,
    });
  }

  console.log('✅ Spareparts created');

  // ============================================================
  // VESSEL CERTIFICATES
  // ============================================================
  const today = new Date();
  const addDays = (d: Date, days: number) => {
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
  };

  await prisma.vesselCertificate.createMany({
    data: [
      // Vessel 1
      { vesselId: vessel1.id, certificateName: 'Safety Management Certificate (SMC)', certificateNumber: 'SMC-2024-001', issuingAuthority: 'MPA Singapore', issueDate: new Date('2024-01-15'), expiryDate: addDays(today, 45), status: 'VALID' },
      { vesselId: vessel1.id, certificateName: 'International Tonnage Certificate', certificateNumber: 'ITC-2024-001', issuingAuthority: 'IACS', issueDate: new Date('2024-03-01'), expiryDate: addDays(today, 180), status: 'VALID' },
      { vesselId: vessel1.id, certificateName: 'MARPOL Annex I Certificate', certificateNumber: 'MARPOL-2024-001', issuingAuthority: 'DNV', issueDate: new Date('2024-01-01'), expiryDate: addDays(today, 20), status: 'EXPIRING_SOON' },
      // Vessel 2
      { vesselId: vessel2.id, certificateName: 'Load Line Certificate', certificateNumber: 'LLC-2024-002', issuingAuthority: 'BV', issueDate: new Date('2024-02-01'), expiryDate: addDays(today, -5), status: 'EXPIRED' },
      { vesselId: vessel2.id, certificateName: 'ISSC Certificate', certificateNumber: 'ISSC-2024-002', issuingAuthority: 'MPA Malaysia', issueDate: new Date('2024-04-01'), expiryDate: addDays(today, 365), status: 'VALID' },
      { vesselId: vessel2.id, certificateName: 'Continuous Synopsis Record', certificateNumber: 'CSR-2024-002', issuingAuthority: 'DOT Malaysia', issueDate: new Date('2024-01-01'), expiryDate: addDays(today, 25), status: 'EXPIRING_SOON' },
      // Vessel 3
      { vesselId: vessel3.id, certificateName: 'International Oil Pollution Prevention', certificateNumber: 'IOPP-2024-003', issuingAuthority: 'MOWCA', issueDate: new Date('2024-03-15'), expiryDate: addDays(today, 90), status: 'VALID' },
      { vesselId: vessel3.id, certificateName: 'Cargo Ship Safety Equipment', certificateNumber: 'CSSE-2024-003', issuingAuthority: 'Biro Klasifikasi Indonesia', issueDate: new Date('2024-01-01'), expiryDate: addDays(today, 15), status: 'EXPIRING_SOON' },
    ],
    skipDuplicates: false,
  });

  console.log('✅ Certificates created');

  // ============================================================
  // SAMPLE WORK ORDERS
  // ============================================================
  const schedules = await prisma.maintenanceSchedule.findMany();

  await prisma.workOrder.createMany({
    data: [
      { woNumber: 'WO-SAMPLE-001', vesselId: vessel1.id, maintenanceScheduleId: schedules[0].id, title: '[PM] Main Engine Oil Change — MV Majestic Dawn', description: 'Scheduled preventive maintenance. Replace engine oil and filters.', priority: 'HIGH', status: 'PENDING', assignedTo: 'Chief Engineer A. Santos', scheduledDate: addDays(today, 1) },
      { woNumber: 'WO-SAMPLE-002', vesselId: vessel2.id, maintenanceScheduleId: schedules[3].id, title: '[PM] Propeller Shaft Inspection — MV Ocean Pioneer', description: 'Routine inspection of shaft seals and bearings.', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedTo: '2nd Engineer M. Reyes', scheduledDate: today },
      { woNumber: 'WO-SAMPLE-003', vesselId: vessel3.id, maintenanceScheduleId: schedules[5].id, title: '[PM] Cargo Pump Maintenance — MT Horizon Star', description: 'Full overhaul of cargo pump. Vessel in dry dock.', priority: 'HIGH', status: 'COMPLETED', assignedTo: 'Chief Engineer K. Nakamura', completedAt: addDays(today, -2) },
      { woNumber: 'WO-SAMPLE-004', vesselId: vessel1.id, title: 'Emergency: Sea Water Pump Leak', description: 'Detected sea water leak from pump flange. Immediate repair required.', priority: 'CRITICAL', status: 'IN_PROGRESS', assignedTo: 'Chief Engineer A. Santos', scheduledDate: today },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sample Work Orders created');

  // ============================================================
  // INITIAL ALERTS
  // ============================================================
  await prisma.alert.createMany({
    data: [
      { type: 'CERTIFICATE_EXPIRY', title: '⚠️ Certificate Expiring Soon: MARPOL Annex I', message: 'MV Majestic Dawn — MARPOL Annex I Certificate expires in 20 days.', severity: 'WARNING', referenceType: 'VesselCertificate' },
      { type: 'CERTIFICATE_EXPIRY', title: '🔴 Certificate EXPIRED: Load Line Certificate', message: 'MV Ocean Pioneer — Load Line Certificate expired 5 days ago. Immediate action required.', severity: 'CRITICAL', referenceType: 'VesselCertificate' },
      { type: 'LOW_STOCK', title: '📦 Low Stock: Fuel Injection Nozzle', message: 'Current stock (3 pcs) is below minimum (4 pcs). Purchase Request auto-generated.', severity: 'WARNING', referenceType: 'Sparepart' },
    ],
    skipDuplicates: false,
  });

  // Auto-generate PR for already-low spareparts
  const fuelNozzle = await prisma.sparepart.findUnique({ where: { partNumber: 'SP-ENG-002' } });
  if (fuelNozzle && fuelNozzle.currentStock < fuelNozzle.minimumStockLevel) {
    await prisma.purchaseRequest.upsert({
      where: { prNumber: 'PR-SEED-001' },
      update: {},
      create: {
        prNumber: 'PR-SEED-001',
        sparepartId: fuelNozzle.id,
        quantityNeeded: 5,
        reason: `Seeded: Stock (${fuelNozzle.currentStock}) below minimum (${fuelNozzle.minimumStockLevel}).`,
        status: 'PENDING',
      },
    });
  }

  const pumpImpeller = await prisma.sparepart.findUnique({ where: { partNumber: 'SP-PMP-001' } });
  if (pumpImpeller && pumpImpeller.currentStock < pumpImpeller.minimumStockLevel) {
    await prisma.purchaseRequest.upsert({
      where: { prNumber: 'PR-SEED-002' },
      update: {},
      create: {
        prNumber: 'PR-SEED-002',
        sparepartId: pumpImpeller.id,
        quantityNeeded: 4,
        reason: `Seeded: Stock (${pumpImpeller.currentStock}) below minimum (${pumpImpeller.minimumStockLevel}).`,
        status: 'PENDING',
      },
    });
  }

  console.log('✅ Initial alerts created');
  console.log('\n🚢 SeaSon database seeded successfully!');
  console.log('   • 3 Vessels');
  console.log('   • 7 Maintenance Schedules');
  console.log('   • 7 Spareparts');
  console.log('   • 8 Certificates (with expiry variations)');
  console.log('   • 4 Sample Work Orders');
  console.log('   • 3 Initial Alerts');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
