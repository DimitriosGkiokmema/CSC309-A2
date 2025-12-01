import { createContext, useState, useEffect } from "react";
import { callBackend } from "../../js/backend";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [role, setRole] = useState("regular");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    async function initRoleFromBackend() {
      // Fetch user info from backend to get role
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          setRole("regular");
          setLoadingRole(false);
          return;
        }; 

        const response = await callBackend('GET', '/users/me', {});
        if (response.ok) {
          setRole(response.data.role);
        } else {
          sessionStorage.setItem("token", "");
          sessionStorage.setItem("loggedIn", "false");
          setRole("regular");
        }
        setLoadingRole(false);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        setLoadingRole(false);
      }
    }
    initRoleFromBackend();
  }, []);

  return (
    <UserContext.Provider value={{ role, setRole, loadingRole }}>
      {children}
    </UserContext.Provider>
  );
}