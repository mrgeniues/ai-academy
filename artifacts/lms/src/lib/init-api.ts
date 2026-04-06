import { setAuthTokenGetter } from "@workspace/api-client-react";

const stored = localStorage.getItem("lms_token");
if (stored) {
  setAuthTokenGetter(() => localStorage.getItem("lms_token"));
}
