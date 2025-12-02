import { createContext, useState, useContext, useEffect } from "react";
import { callBackend } from "../../js/backend";
// import { load } from "mime";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [role, setRole] = useState("regular");
  const [loadingRole, setLoadingRole] = useState(true);
  const [pic, setPic] = useState("");

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

    const handleBeforeUnload = () => {
      setRole("regular");
    };

    initRoleFromBackend();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <UserContext.Provider value={{ role, setRole, loadingRole, pic, setPic }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
