import autocannon from "autocannon";

async function run() {
  let login;
  try {
    const res = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sahil@test.com", password: "testpass123" }),
    });
    login = await res.json();
  } catch (err) {
    console.error(
      "\n❌ Could not connect to http://localhost:4000 (ECONNREFUSED).\n" +
        "Make sure your backend server is running in another terminal window:\n" +
        "  cd apps/backend\n" +
        "  npm run dev\n",
    );
    return;
  }

  if (!login.success || !login.data?.accessToken) {
    console.error("Login failed. Check that your user credentials exist in the database:", login);
    return;
  }

  const token = login.data.accessToken;

  const result = await autocannon({
    url: "http://localhost:4000/api/analytics/dashboard",
    connections: 10,
    duration: 15,
    headers: { Authorization: `Bearer ${token}`, "x-load-test": "true" },
  });

  console.log(autocannon.printResult(result));
}

run();