import { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [role, setRole] = useState("regular");
  const [pic, setPic] = useState("");

  useEffect(() => {
    const handleBeforeUnload = () => {
      setRole("regular");
      setPic("");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <UserContext.Provider
      value={{
        role,
        setRole,
        pic,
        setPic
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
