import UsersListing from "../components/UsersListing/UsersListing";
import Registration from "./Registration";

export default function Management() {
    return (
        <div>
            <Registration />
            <UsersListing />
        </div>
    );
}