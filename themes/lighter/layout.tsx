import React, { FC, ReactNode } from "react";
import styles from "./styles.module.scss";

const LigtherTheme = ({
  Header,
  Sidebar,
  Footer,
  children,
}: {
  Header?: FC;
  Sidebar?: FC;
  Footer?: FC;
  children: ReactNode;
}) => {
  return (
    <div className={`${styles.LightTheme} font-inter`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#006b65] focus:text-white focus:rounded focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      {Header && <Header />}
      <div className="content-wrapper">
        {Sidebar && <Sidebar />}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      {Footer && <Footer />}
    </div>
  );
};

export default LigtherTheme;
