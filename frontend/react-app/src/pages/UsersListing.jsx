import { useEffect, useState } from "react";
import { callBackend } from "../js/backend.js";
import { useUser } from "../components/UserContext/useUser.js";

const ROLE_OPTIONS = ["regular", "cashier", "manager", "superuser"];

export default function UsersListing() {
    const { role, loadingRole } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");

    const currentRole = role;

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [count, setCount] = useState(0);

    const [filterRole, setFilterRole] = useState("all");
    const [filterVerified, setFilterVerified] = useState("all");

    const [orderBy, setOrderBy] = useState("default");
    const [orderDir, setOrderDir] = useState("asc");

    const totalPages = Math.max(1, Math.ceil(count / limit));

    function sortUsers(list) {
        if (orderBy === "default") {
            return list;
        }

        const sorted = [...list];

        sorted.sort((a, b) => {
            const field = orderBy;
            let av = a[field];
            let bv = b[field];

            const misssingA = av === null || av === undefined;
            const misssingB = bv === null || bv === undefined;

            if (misssingA && !misssingB) return 1;
            if (!misssingA && misssingB) return -1;
            if (misssingA && misssingB) return 0;

            let comparison = 0;

            if (["name", "email", "role"].includes(field)) {
                av = String(av).toLowerCase();
                bv = String(bv).toLowerCase();
                comparison = av.localeCompare(bv);
            } else if (field === "birthday") {
                comparison = new Date(av) - new Date(bv);
            } else if (["id", "points"].includes(field)) {
                comparison = av - bv;
            } else if (field === "verified") {
                comparison = (av === true ? 1 : 0) - (bv === true ? 1 : 0);
            }

            return orderDir === "asc" ? comparison : -comparison;
        });

        return sorted;
    }


    useEffect(() => {
        async function fetchUsers(currentPage, currentLimit) {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams();
                params.set("page", currentPage);
                params.set("limit", currentLimit);
                if (filterRole !== "all") {
                    params.set("role", filterRole);
                }

                if (filterVerified === "verified") {
                    params.set("verified", "true");
                } else if (filterVerified === "unverified") {
                    params.set("verified", "false");
                }

                const url = `/users?${params.toString()}`;
                const response = await callBackend('GET', url, {});

                if (response.ok) {
                    const data = response.data || {};
                    const results = data.results || [];

                    const sortedUsers = sortUsers(results);
                    setUsers(sortedUsers);

                    if (typeof data.count === "number") {
                        setCount(data.count);
                    } else {
                        setCount(results.length);
                    }
                } else {
                    setError("Failed to fetch users");
                    setUsers([]);
                    setCount(0);
                }
            } catch (error) {
                setError("Failed to fetch users");
                setUsers([]);
                setCount(0);
            }

            setLoading(false);
        }
        fetchUsers(page, limit);
    }, [page, limit, filterRole, filterVerified, orderBy, orderDir]);


    async function updateUser(userId, payload) {
        const response = await callBackend('PATCH', `/users/${userId}`, payload);
        if (!response.ok) {
            const message = response.data?.message || "Failed to update user";
            alert(message);
            throw new Error(message);
        }

        const updated = response.data;
        setUsers((prevUsers) =>
            sortUsers(prevUsers.map((user) => (user.id === userId ? { ...user, ...updated } : user)))
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

    const filteredUsers = users.filter((user) => {
        if(!searchTerm.trim()) return true;

        const lowerSearch = searchTerm.toLowerCase();
        return (
            user.utorid.toLowerCase().includes(lowerSearch) ||
            user.name.toLowerCase().includes(lowerSearch) ||
            user.email.toLowerCase().includes(lowerSearch)
        );
    });

    return (
        <div>
            {
                // Only superusers and managers can access this page
                (currentRole !== 'superuser' && currentRole !== 'manager') ? (
                    <div>You do not have permission to view this page.</div>
                ) : (
                    <div>
                        <h1>Users Listing</h1>
                        <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
                            <div>
                                <label className="form-label mb-3">Show per page</label>
                                <select
                                    className="form-select"
                                    value={limit}
                                    onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                                >
                                    {[5, 10, 20, 50].map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label mb-3">Search</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by Utorid, Name, or Email"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>

                            <div>
                                <label className="form-label mb-3">Filter by Role</label>
                                <select
                                    className="form-select"
                                    value={filterRole}
                                    onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                                >
                                    <option value="all">All</option>
                                    {ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label mb-3">Filter by Verification</label>
                                <select
                                    className="form-select"
                                    value={filterVerified}
                                    onChange={(e) => { setFilterVerified(e.target.value); setPage(1); }}
                                >
                                    <option value="all">All</option>
                                    <option value="verified">Verified</option>
                                    <option value="unverified">Unverified</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label mb-3">Sort by</label>
                                <select
                                    className="form-select"
                                    value={orderBy}
                                    onChange={(e) => setOrderBy(e.target.value)}
                                >
                                    <option value="default">Default</option>
                                    <option value="name">Name</option>
                                    <option value="email">Email</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="points">Points</option>
                                    <option value="role">Role</option>
                                    <option value="verified">Verified</option>
                                </select>
                            </div>


                            <div>
                                <label className="form-label mb-3">Order</label>
                                <select
                                    className="form-select"
                                    value={orderDir}
                                    onChange={(e) => setOrderDir(e.target.value)}
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            </div>
                        </div>
                        {/* Bootstrap Table to display users */}
                        <table className="table table-striped table-bordered">
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
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center">No users found.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => {
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
                                })
                                )}
                            </tbody>
                        </table>
                        <div className="d-flex justify-content-center align-items-center">
                                <button
                                    className="btn btn-secondary me-2"
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                                <div>
                                    Page {page} of {totalPages}
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                        </div>
                    </div>
                )
            }

        </div>

    );
}