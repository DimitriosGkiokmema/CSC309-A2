import UsersListing from "../components/UsersListing/UsersListing";
import Registration from "./Registration";
import { useUser } from "../components/UserContext/index.jsx";

export default function Management() {
    const { role } = useUser();
    const clearance = (role === 'cashier' || role === 'manager' || role === 'superuser');

    return (
        <div>
            {clearance && (
                <div>
                    <Registration />
                </div>
            )}

            {(role === 'manager' || role === 'superuser') && (
                <div>
                    <UsersListing />
                </div>
            )}

            {!clearance && (
                <div className="placeHolder">
                    Only managers and higher have access to user management!
                </div>
            )}
        </div>
    );
}