import { type AppType } from "next/dist/shared/lib/utils";
import "~/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Component {...pageProps} />
      <ToastContainer theme="dark" />
    </>
  );
};

export default MyApp;
