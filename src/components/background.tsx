import React from "react";
import { useState } from "react";
import HeaderComp from "./HeaderComp";
import FooterComp from "./FooterComp";
 const Background: React.FC<{ children: any }> = ()=>{
    const [background, setBackground] = useState(false)
	const showNavHandler = () => {
		setBackground(true);
	};
	const hideNavHandler = () => {
		setBackground(false);
	};
    return(
        <div>
            	<div className={`app-inner ${background ? "change" : "hide"}`}>
				
                <HeaderComp>


                </HeaderComp>
                {background ? (
                    <i className="fa-solid fa-moon c-pointer" onClick={hideNavHandler}> </i>
                ) : (
                    <i className="fa-solid fa-sun c-pointer" onClick={showNavHandler}> </i>
                )}
              
                <FooterComp />
            </div>
        </div>
    )
 }
 export default Background