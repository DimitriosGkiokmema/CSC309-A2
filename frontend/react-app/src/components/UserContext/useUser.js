import { useContext } from "react";
import { UserContext } from "./index.jsx";

export function useUser() {
  return useContext(UserContext);
}
