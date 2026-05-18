import { run } from "../server/db.js";

async function main() {
  const drivers = await run("DELETE FROM driver_applications WHERE status IN ('approved', 'rejected')");
  const pharmacies = await run("DELETE FROM pharmacy_applications WHERE status IN ('approved', 'rejected')");

  console.log(
    JSON.stringify({
      drivers: drivers.rowCount ?? drivers.changes ?? 0,
      pharmacies: pharmacies.rowCount ?? pharmacies.changes ?? 0
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
