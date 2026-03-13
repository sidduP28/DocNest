// Force use of Google DNS to resolve MongoDB SRV records (bypass ISP DNS issues)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const Hospital = require('./models/Hospital');
const User = require('./models/User');

const serviceAccount = require('./firebase-admin-sdk.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const DEMO_PASSWORD = 'Demo@1234';

async function createFirebaseUser(email, password, displayName) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password, displayName });
    return user.uid;
  } catch (err) {
    const user = await admin.auth().createUser({ email, password, displayName });
    return user.uid;
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'docnest' });
  console.log('Connected to MongoDB');

  // ── Hospitals ─────────────────────────────────────────────────────────────
  const hospitalData = [
    {
      email: 'apollo@docnest.demo',
      name: 'Apollo Hospitals Greams Road',
      type: 'Private', phone: '044-28293333', ratings: 4.8,
      address: '21, Greams Lane, Off Greams Road, Chennai - 600006',
      location: { lat: 13.0612, lng: 80.2478 },
      testPrices: { bloodTest: 350, MRI: 6500, xRay: 400, ECG: 300, urineCulture: 450, ctScan: 4500 },
      currentQueueCount: 8,
      doctors: [
        { name: 'Dr. Priya Ramesh', specialty: 'Cardiology', qualification: 'MD, DM Cardiology',
          slots: ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','02:00 PM','02:30 PM','03:00 PM'] },
        { name: 'Dr. Suresh Venkataraman', specialty: 'Orthopedics', qualification: 'MS Ortho',
          slots: ['10:00 AM','10:30 AM','11:00 AM','03:00 PM','03:30 PM','04:00 PM'] },
        { name: 'Dr. Meena Krishnaswamy', specialty: 'Neurology', qualification: 'DM Neurology',
          slots: ['09:00 AM','09:30 AM','11:00 AM','11:30 AM'] },
      ],
    },
    {
      email: 'fortis@docnest.demo',
      name: 'Fortis Malar Hospital',
      type: 'Private', phone: '044-42892222', ratings: 4.6,
      address: '52, 1st Main Road, Gandhi Nagar, Adyar, Chennai - 600020',
      location: { lat: 13.0002, lng: 80.2565 },
      testPrices: { bloodTest: 280, MRI: 5800, xRay: 350, ECG: 250, urineCulture: 400, ctScan: 4000 },
      currentQueueCount: 12,
      doctors: [
        { name: 'Dr. Arun Balaji', specialty: 'General Surgery', qualification: 'MS Surgery',
          slots: ['08:30 AM','09:00 AM','09:30 AM','10:00 AM','02:00 PM','02:30 PM'] },
        { name: 'Dr. Lakshmi Narayan', specialty: 'Gynecology', qualification: 'MD OBG',
          slots: ['10:00 AM','10:30 AM','11:00 AM','11:30 AM','04:00 PM','04:30 PM'] },
      ],
    },
    {
      email: 'kauvery@docnest.demo',
      name: 'Kauvery Hospital Alwarpet',
      type: 'Private', phone: '044-40009999', ratings: 4.5,
      address: '199, Luz Church Road, Mylapore, Chennai - 600004',
      location: { lat: 13.0358, lng: 80.2560 },
      testPrices: { bloodTest: 220, MRI: 5200, xRay: 300, ECG: 220, urineCulture: 350, ctScan: 3800 },
      currentQueueCount: 5,
      doctors: [
        { name: 'Dr. Vijay Anand', specialty: 'Dermatology', qualification: 'MD Dermatology',
          slots: ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','05:00 PM','05:30 PM'] },
        { name: 'Dr. Saranya Mohan', specialty: 'Pediatrics', qualification: 'MD Pediatrics',
          slots: ['11:00 AM','11:30 AM','12:00 PM','04:00 PM','04:30 PM'] },
      ],
    },
    {
      email: 'ggh@docnest.demo',
      name: 'Government General Hospital Chennai',
      type: 'Government', phone: '044-25305000', ratings: 4.1,
      address: 'Park Town, Chennai - 600003',
      location: { lat: 13.0827, lng: 80.2707 },
      testPrices: { bloodTest: 80, MRI: 1200, xRay: 100, ECG: 80, urineCulture: 120, ctScan: 1000 },
      currentQueueCount: 25,
      doctors: [
        { name: 'Dr. Chandrasekaran R', specialty: 'General Medicine', qualification: 'MD General Medicine',
          slots: ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM'] },
        { name: 'Dr. Padmavathi S', specialty: 'ENT', qualification: 'MS ENT',
          slots: ['10:00 AM','10:30 AM','11:00 AM','11:30 AM'] },
      ],
    },
    {
      email: 'miot@docnest.demo',
      name: 'MIOT International Hospital',
      type: 'Private', phone: '044-22490900', ratings: 4.7,
      address: '4/112, Mount Poonamallee Road, Manapakkam, Chennai - 600089',
      location: { lat: 13.0155, lng: 80.1724 },
      testPrices: { bloodTest: 300, MRI: 6000, xRay: 380, ECG: 280, urineCulture: 420, ctScan: 4200 },
      doctors: [
        { name: 'Dr. Rajesh Kumar M', specialty: 'Oncology', qualification: 'MD, DM Oncology',
          slots: ['09:00 AM','09:30 AM','10:00 AM','03:00 PM','03:30 PM'] },
        { name: 'Dr. Anitha Selvam', specialty: 'Nephrology', qualification: 'DM Nephrology',
          slots: ['11:00 AM','11:30 AM','12:00 PM','04:00 PM'] },
      ],
    },
  ];

  for (const hData of hospitalData) {
    console.log(`\nSeeding hospital: ${hData.name}`);
    const uid = await createFirebaseUser(hData.email, DEMO_PASSWORD, hData.name);
    const existing = await Hospital.findOne({ firebaseUid: uid });
    if (existing) {
      console.log(`  → Already exists, updating...`);
      existing.name = hData.name;
      existing.type = hData.type;
      existing.address = hData.address;
      existing.location = hData.location;
      existing.phone = hData.phone;
      existing.ratings = hData.ratings;
      existing.testPrices = hData.testPrices;
      existing.verificationStatus = 'verified';
      existing.bloodBankLicense = true;
      existing.doctors = hData.doctors.map((d) => ({
        name: d.name, specialty: d.specialty, qualification: d.qualification,
        slots: d.slots.map((t) => ({ time: t, isBooked: false })),
        availabilityStatus: 'available',
        approvalStatus: 'approved'
      }));
      await existing.save();
      console.log(`  ✅ Updated hospital: ${hData.name}`);
      continue;
    }
    await Hospital.create({
      firebaseUid: uid,
      name: hData.name, type: hData.type,
      address: hData.address, location: hData.location,
      phone: hData.phone, email: hData.email,
      contactPersonName: 'Admin', contactPersonDesignation: 'Manager',
      verificationStatus: 'verified', bloodBankLicense: true,
      ratings: hData.ratings, testPrices: hData.testPrices,
      doctors: hData.doctors.map((d) => ({
        name: d.name, specialty: d.specialty, qualification: d.qualification,
        slots: d.slots.map((t) => ({ time: t, isBooked: false })),
        availabilityStatus: 'available',
        approvalStatus: 'approved'
      })),
    });
    console.log(`  ✅ Created hospital: ${hData.name} (uid: ${uid})`);
  }

  // ── Patients ───────────────────────────────────────────────────────────────
  const patientData = [
    { name: 'Arjun Sharma',    email: 'arjun@docnest.demo',   bloodGroup: 'O-',  phone: '9841234567', city: 'Chennai', pincode: '600006', location: { lat: 13.0650, lng: 80.2490 } },
    { name: 'Preethi Sundaram',email: 'preethi@docnest.demo', bloodGroup: 'A+',  phone: '9884567890', city: 'Chennai', pincode: '600020', location: { lat: 13.0010, lng: 80.2580 } },
    { name: 'Karthik Rajan',   email: 'karthik@docnest.demo', bloodGroup: 'B+',  phone: '9790123456', city: 'Chennai', pincode: '600004', location: { lat: 13.0370, lng: 80.2570 } },
    { name: 'Divya Nair',      email: 'divya@docnest.demo',   bloodGroup: 'O+',  phone: '9962345678', city: 'Chennai', pincode: '600003', location: { lat: 13.0820, lng: 80.2700 } },
    { name: 'Mohammed Irfan',  email: 'irfan@docnest.demo',   bloodGroup: 'AB-', phone: '9003456789', city: 'Chennai', pincode: '600089', location: { lat: 13.0160, lng: 80.1730 } },
  ];

  for (const pData of patientData) {
    console.log(`\nSeeding patient: ${pData.name}`);
    const uid = await createFirebaseUser(pData.email, DEMO_PASSWORD, pData.name);
    const existing = await User.findOne({ firebaseUid: uid });
    if (existing) { console.log(`  → Already exists, skipping`); continue; }
    await User.create({ firebaseUid: uid, ...pData, donorStatus: true });
    console.log(`  ✅ Created patient: ${pData.name} (uid: ${uid})`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Demo login credentials (password for all: Demo@1234):');
  console.log('HOSPITALS: apollo@docnest.demo | fortis@docnest.demo | kauvery@docnest.demo | ggh@docnest.demo | miot@docnest.demo');
  console.log('PATIENTS:  arjun@docnest.demo | preethi@docnest.demo | karthik@docnest.demo | divya@docnest.demo | irfan@docnest.demo');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error('Seed error:', err); process.exit(1); });
