export default function ProfilePage() {
  const user = {
    name: "Jane Doe",
    email: "jane@example.com"
  };

  return (
    <div>
      <h1>User Profile</h1>

      <div>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>
    </div>
  );
}
