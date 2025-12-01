import { useEffect, useState } from "react";
import { callBackend } from "../../js/backend.js";
import { useUser } from "../UserContext/useUser.js";

const ROLE_OPTIONS = ["regular", "cashier", "manager", "superuser"];

export default function UsersListing() {
    const { role, loadingRole } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const currentRole = role;


    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            setError(null);
            const response = await callBackend('GET', '/users', {});
            // handle response ok and not ok cases
            if (response.ok) {
                setUsers(response.data.results);
            } else {
                setError("Failed to fetch users");
            }
            setLoading(false);
        }
        fetchUsers();
    }, []);


    async function updateUser(userId, payload) {
        const response = await callBackend('PATCH', `/users/${userId}`, payload);
        if (!response.ok) {
            const message = response.data?.message || "Failed to update user";
            alert(message);
            throw new Error(message);
        }

        const updated = response.data;
        setUsers((prevUsers) =>
            prevUsers.map((user) =>
                user.id === userId ? { ...user, ...updated } : user
            )
        );
        return updated;
    }

    const handleVerify = async (user) => {
        await updateUser(user.id, { verified: true });
    };

    const handleToggleSuspicious = async (user) => {
        if (user.role !== 'cashier') return;
        // pass email, verified, suspicious, role 
        await updateUser(user.id, { 
            email: user.email,
            verified: user.verified,
            role: user.role,
            suspicious: !user.suspicious 
        });
    };

    const handleRoleChange = async (user, newRole) => {
        if (newRole === user.role) return;

        const confirmChange = window.confirm(`Are you sure you want to change ${user.utorid}'s role from ${user.role} to ${newRole}?`);
        if (!confirmChange) return;

        await updateUser(user.id, { role: newRole });
    };

    const getRoleOptionsForCurrentUser = () => {
        if (currentRole == "superuser") {
            return ROLE_OPTIONS;
        } else if (currentRole == "manager") {
            return ROLE_OPTIONS.slice(0, 3); // regular, cashier, manager
        } else if (currentRole == "cashier") {
            return ROLE_OPTIONS.slice(0, 2); // regular, cashier
        } else {
            return ROLE_OPTIONS.slice(0, 1); // regular
        }

    }

    const roleOptions = getRoleOptionsForCurrentUser();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (loadingRole) {
        return <div>Loading...</div>;
    }

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
                    {users.map((user) => {
                        const suspiciousLabel = user.role !== 'cashier'
                            ? "N/A"
                            : user.suspicious === undefined
                                ? "-"
                                : user.suspicious ? "Yes" : "No";

                        return (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.utorid}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.birthday}</td>
                                <td>{user.points}</td>
                                <td>{user.role}</td>
                                <td>{user.verified ? "Yes" : "No"}</td>
                                <td>{suspiciousLabel}</td>
                                <td className="d-flex flex-column gap-1">
                                    {!user.verified && (
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleVerify(user)}
                                        >
                                            Verify
                                        </button>
                                    )}
                                    {/* Suspicious toggle - only for cashiers */}
                                    {user.role === 'cashier' && (
                                        <button
                                            className="btn btn-sm btn-warning"
                                            onClick={() => handleToggleSuspicious(user)}
                                        >
                                            {user.suspicious ? "Mark as Not Suspicious" : "Mark as Suspicious"}
                                        </button>
                                    )}

                                    {/* role dropwdown - promote/demote */}
                                    {roleOptions.length > 1 && (
                                        <select
                                            className="form-select form-select-sm"
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user, e.target.value)}
                                        >
                                            {roleOptions.map((role) => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    )}
                                </td>
                            </tr>
                        );
                    })}

                </tbody>
            </table>
        </div>

    );
}