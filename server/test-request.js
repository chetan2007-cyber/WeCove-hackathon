const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRegister() {
  const res = await fetch('https://wecove-hackathon.onrender.com//api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      role: "Patient"
    })
  });
  const data = await res.json();
  console.log(data);
}

testRegister();