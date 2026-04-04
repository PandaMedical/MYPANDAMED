export const seedData = {
  users: [
    { first_name: "Admin", last_name: "PandaMed", phone: "0550000000", email: "admin@pandamed.dz", role: "admin", status: "actif", password: "Admin123!", password_hint: "Admin123!" },
    { first_name: "Sara", last_name: "Operateur", phone: "0550000001", email: "sara@pandamed.dz", role: "operateur", status: "actif", password: "Sara2024!", password_hint: "Sara2024!" }
  ],
  sponsors: [
    { name: "ASMIDAL", slogan: "We invest now, we build the future", logo: "🏥", type: "premium", website: "", is_active: 1 },
    { name: "Pharma Plus", slogan: "Medicaments a domicile", logo: "💊", type: "standard", website: "", is_active: 0 }
  ],
  patients: [
    { first_name: "Amira", last_name: "Merakchi", phone: "0555123456", email: "amira@email.dz", password: "Patient123", date_of_birth: "1985-03-12", sex: "Feminin", address: "Cite 600 Logts Bt4", postal_code: "23000", wilaya: "Annaba", area: "El Hadjar", conditions: "Diabete T2", allergies: "Penicilline", notes: "" },
    { first_name: "Yacine", last_name: "Bouzid", phone: "0660987654", email: "yacine.b@email.dz", password: "Patient123", date_of_birth: "1972-08-20", sex: "Masculin", address: "Cite AADL Bt3 App5", postal_code: "23015", wilaya: "Annaba", area: "El Bouni", conditions: "HTA, Diabete T2", allergies: "Aucune", notes: "" },
    { first_name: "Fatima", last_name: "Hamidi", phone: "0771224466", email: "f.hamidi@email.dz", password: "Patient123", date_of_birth: "1990-11-05", sex: "Feminin", address: "Residence Yasmine Bt1", postal_code: "23016", wilaya: "Annaba", area: "Sidi Amar", conditions: "Asthme", allergies: "Aspirine, AINS", notes: "" }
  ],
  pharmacies: [
    { name: "Pharmacie El Amel", manager_name: "Dr. Nadia", phone: "038860001", whatsapp: "0550123456", email: "elamel@ph.dz", password: "Pharma123", address: "12 Rue Didouche Mourad", postal_code: "23000", wilaya: "Annaba", area: "Centre", zone_name: "Annaba Centre", opening_hours: "08h-20h / 7j/7", status: "online" },
    { name: "Pharmacie El Shifa", manager_name: "Dr. Amine", phone: "038730002", whatsapp: "0661234567", email: "elshifa@ph.dz", password: "Pharma123", address: "Cite 800 Logts", postal_code: "23015", wilaya: "Annaba", area: "El Bouni", zone_name: "El Bouni", opening_hours: "08h-19h / 6j/7", status: "online" },
    { name: "Pharmacie Berrahou", manager_name: "Dr. Karim", phone: "038740003", whatsapp: "0772345678", email: "berrahou@ph.dz", password: "Pharma123", address: "Cite Benboulaid", postal_code: "23016", wilaya: "Annaba", area: "Sidi Amar", zone_name: "Sidi Amar", opening_hours: "08h-20h / 7j/7", status: "busy" }
  ],
  drivers: [
    { first_name: "Karim", last_name: "Benali", phone: "0555001122", email: "karim.b@drv.dz", password: "Livreur123", zone_name: "Annaba Centre", vehicle: "moto", status: "actif", rating: 4.9, packages_count: 127, revenue: 381000 },
    { first_name: "Sofiane", last_name: "Madi", phone: "0660334455", email: "sofiane.m@drv.dz", password: "Livreur123", zone_name: "El Bouni", vehicle: "moto", status: "actif", rating: 4.7, packages_count: 94, revenue: 282000 },
    { first_name: "Rafik", last_name: "Djamel", phone: "0770556677", email: "rafik.d@drv.dz", password: "Livreur123", zone_name: "Sidi Amar", vehicle: "voiture", status: "actif", rating: 4.8, packages_count: 156, revenue: 468000 }
  ],
  catalog_items: [
    { name: "Doliprane 1g", category: "otc", form: "Comprime", unit: "boite", price: 280, reference: "DOL1G", image: "", contraindications: "Insuffisance hepatique severe, allergie au paracetamol", is_active: 1 },
    { name: "Ibuprofene 400mg", category: "otc", form: "Comprime", unit: "boite", price: 310, reference: "IBU400", image: "", contraindications: "Ulcere gastroduodenal, insuffisance renale, grossesse", is_active: 1 },
    { name: "Ventoline spray", category: "otc", form: "Spray", unit: "flacon", price: 850, reference: "VENT", image: "", contraindications: "Allergie salbutamol, tachycardie severe", is_active: 1 },
    { name: "Serum physiologique", category: "otc", form: "Solution", unit: "boite", price: 380, reference: "SERUM", image: "", contraindications: "Aucune connue", is_active: 1 },
    { name: "Glucometre OneTouch", category: "para", form: "Dispositif", unit: "unite", price: 3200, reference: "GLUCO", image: "", contraindications: "Aucune", is_active: 1 },
    { name: "Masque FFP2", category: "para", form: "Masque", unit: "boite", price: 890, reference: "FFP2", image: "", contraindications: "Allergie au polypropylene", is_active: 1 }
  ],
  orders: [
    { patient_phone: "0555123456", pharmacy_name: "Pharmacie El Amel", driver_phone: "0555001122", products: "Doliprane 1g x3", amount: 900, status: "delivered", channel: "whatsapp", source: "call", notes: "" },
    { patient_phone: "0660987654", pharmacy_name: "Pharmacie El Shifa", driver_phone: "0660334455", products: "Ibuprofene 400mg x1", amount: 1200, status: "dispatch", channel: "whatsapp", source: "web", notes: "" },
    { patient_phone: "0771224466", pharmacy_name: "Pharmacie Berrahou", driver_phone: null, products: "Ventoline + Serum physiologique", amount: 2100, status: "confirmed", channel: "email", source: "call", notes: "" }
  ],
  patient_registrations: [
    { first_name: "Lina", last_name: "Saadi", phone: "0556112233", email: "lina.saadi@email.dz", wilaya: "Annaba", area: "Centre", address: "Rue Emir Abdelkader", conditions: "Aucune", allergies: "Aucune", notes: "Nouvelle inscription", password: "Patient123", status: "pending" },
    { first_name: "Nassim", last_name: "Kaci", phone: "0667445566", email: "nassim.kaci@email.dz", wilaya: "Annaba", area: "El Bouni", address: "Cite 1200 Logts", conditions: "Asthme", allergies: "Pollen", notes: "Patient a rappeler", password: "Patient123", status: "pending" }
  ]
};
