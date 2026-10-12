import HomeSections from "@/components/HomeSections";
import { serverApi } from "@/lib/api";

export default async function Home() {
  let sections = [];
  let failed = false;
  try {
    ({ sections } = await serverApi("/api/home"));
  } catch (err) {
    console.error("home sections unavailable", err.message);
    failed = true;
  }
  return (
    <main>
      {failed ? (
        <p className="message error" style={{ padding: "120px 16px" }}>
          The shop is taking a short break. Please refresh in a moment.
        </p>
      ) : (
        <HomeSections sections={sections} />
      )}
    </main>
  );
}
