import React, { useEffect, useState } from "react";
import FooterComp from "../components/FooterComp";
import HeaderComp, { navList } from "../components/HeaderComp";
import { useRouter } from "next/router";
const FrontLayout: React.FC<{ children: React.ReactElement }> = ({ children }) => {
	const [background, setBackground] = useState(false)
	const router = useRouter();
	const darkMode = () => {
		setBackground(true);
	};
	const lightMode = () => {
		setBackground(false);
	};
	
	return (
		<div className="app">
			<main className="app-children">
				<div className={`app-inner ${background ? "change" : "hide"}`}>
				{background ? (
						<i className="fa-solid fa-moon c-pointer" onClick={lightMode}> </i>
					) : (
						<i className="fa-solid fa-sun c-pointer" onClick={darkMode}> </i>
					)
					}
					<HeaderComp/>
					{children}
					<FooterComp />
				</div>
			</main >
		</div >
	);
};

export default FrontLayout;
