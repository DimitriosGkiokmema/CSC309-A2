// sample user data from backend
//  {
//             "id": 1,
//             "utorid": "alice123",
//             "name": "alice1",
//             "email": "alice@mail.utoronto.ca",
//             "birthday": "2000-01-01T00:00:00.000Z",
//             "role": "superuser",
//             "points": 0,
//             "createdAt": "2025-11-30T01:49:12.361Z",
//             "lastLogin": "2025-11-30T01:49:12.361Z",
//             "verified": true,
//             "avatarUrl": ""
//         },

import { useEffect, useState } from "react";
import { callBackend } from "../../js/backend.js";


export default function UsersListing() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function fetchUsers() {
            const response = await callBackend('GET', '/users', {});
            // handle response ok and not ok cases
            if (response.ok) {
                console.log("Fetched users:", response.data.results);
                setUsers(response.data.results);
            } else {
                console.error("Failed to fetch users");
            }
        }
        fetchUsers();
    }, []);

    return (
        <div>
            <h1>Users Listing</h1>
            {/* Bootstrap Table to display users */}
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Utorid</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Birthday</th>
                        <th>Role</th>
                        <th>Points</th>
                        <th>Verified</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.utorid}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.birthday}</td>
                            <td>{user.role}</td>
                            <td>{user.points}</td>
                            <td>{user.verified ? "Yes" : "No"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

    );
}