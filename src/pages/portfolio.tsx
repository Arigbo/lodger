import React from "react";
import FrontLayout from "../layouts/front.layout";
import { useState } from "react";
import { faImages } from "@fortawesome/free-solid-svg-icons";
export const collectionAll = [
    { name: "RALONIK", image: "./images/jesse.jpg", },
    { name: "Lodger", image: "./images/avatar.jpg", },
    { name: "Lodger", image: "./images/avatar.jpg", },
]
export const collectionWebDev = [
    { name: "Ralonik", image: "./images/jesse.jpg", }
]
export const collectionWebResearch = [
    { name: "Lodger", image: "./images/avatar.jpg", }
]
export const collectionUnfinishedProject = [
    { name: "Lodger", image: "./images/avatar.jpg", }
]
const Portfolio = () => {
    const [singleServicesDisplay, setSingleServicesDisplay] = useState(false);
    const [singleServicesSecondDisplay, setSingleServicesSecondDisplay] = useState(false);
    const [singleServicesThirdDisplay, setSingleServicesThirdDisplay] = useState(false);
    const [singleServicesFourthDisplay, setSingleServicesFourthDisplay] = useState(false);

    //FIRST FUNCTION
    const hideSingleServicesHandler = () => {
        // setSingleServicesDisplay(true);

    };
    const showSingleServicesHandler = () => {
        setSingleServicesDisplay(false);
        setSingleServicesSecondDisplay(false);
        setSingleServicesThirdDisplay(false);
        setSingleServicesFourthDisplay(false);

    };
    //SECOND FUNCTION
    const revailSingleServicesSecondHandler = () => {
        setSingleServicesSecondDisplay(true);
        setSingleServicesDisplay(true);
        setSingleServicesThirdDisplay(false);
        setSingleServicesFourthDisplay(false);

    };
    const returnSingleServicesSecondHandler = () => {
        // setSingleServicesSecondDisplay(false);
    };
    //THIRD FUNCTION
    const revailSingleServicesThirdHandler = () => {
        setSingleServicesThirdDisplay(true);
        setSingleServicesDisplay(true);
        setSingleServicesSecondDisplay(false);
        setSingleServicesFourthDisplay(false);

    };
    const returnSingleServicesThirdHandler = () => {
        // setSingleServicesThirdDisplay(false);
    };
    //FOURTH FUNCTION
    const revailSingleServicesFourthHandler = () => {
        setSingleServicesFourthDisplay(true);
        setSingleServicesDisplay(true);
        setSingleServicesThirdDisplay(false);
        setSingleServicesSecondDisplay(false);
    };
    const returnSingleServicesFourthHandler = () => {
        // setSingleServicesFourthDisplay(false);
    };

    return (
        <div>
            <FrontLayout>
                <div>
                    <div className="portfolio-page container">

                        <section className="portfolio-page-text">
                            <div className="portfolio-page-text-header">
                                <h1>MY COLLECTIONS</h1>
                            </div>
                            <div className="portfolio-page-text-note">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Cumque necessitatibus aperiam labore nobis cupiditate? Delectus, facilis aperiam! Deleniti, blanditiis repudiandae?</p>
                            </div>
                        </section>
                        {/* COLLECTION SECTION */}
                        <div className="portfolio-page-collection">
                            {/* DESLTOP VIEW */}
                            <div className="portfolio-page-collection-inner desktop">

                                <div className="portfolio-page-collection-inner-header">
                                    {/* First-single-services */}
                                    <div className={"portfolio-page-collection-inner-header-inner-top"}>

                                        {singleServicesDisplay ? (
                                            <div className="portfolio-page-collection-inner-header-inner-top-inner c-pointer" onClick={showSingleServicesHandler}>
                                                <h6 >{"ALL"}</h6>

                                            </div>
                                        ) : (
                                            <div className={`portfolio-page-collection-inner-header-inner-top-inner c-pointer ${singleServicesDisplay ? "" : "active"}`} onClick={hideSingleServicesHandler}>
                                                <h6>{"ALL"}</h6>

                                            </div>
                                        )}
                                    </div>
                                    {/* Second-single-services */}
                                    <div className={"portfolio-page-collection-inner-header-inner-top"}>

                                        {singleServicesSecondDisplay ? (
                                            <div className={`portfolio-page-collection-inner-header-inner-top-inner c-pointer ${singleServicesSecondDisplay ? "active" : "div"}`} onClick={returnSingleServicesSecondHandler}>
                                                <h6>{"WEB DEV"}</h6>

                                            </div>

                                        ) : (
                                            <div className="portfolio-page-collection-inner-header-inner-top-inner c-pointer" onClick={revailSingleServicesSecondHandler}>
                                                <h6>{"WEB DEV"}</h6>

                                            </div>

                                        )}

                                    </div>
                                    {/* Third-single-services */}
                                    <div className="portfolio-page-collection-inner-header-inner-top">
                                        {singleServicesThirdDisplay ? (
                                            <div className={`portfolio-page-collection-inner-header-inner-top-inner c-pointer ${singleServicesThirdDisplay ? "active" : "div"}`} onClick={returnSingleServicesThirdHandler} >
                                                <h6>{"WEB RESEARCH"}</h6>

                                            </div>

                                        ) : (
                                            <div className="portfolio-page-collection-inner-header-inner-top-inner c-pointer" onClick={revailSingleServicesThirdHandler}>
                                                <h6 >{"WEB RESEARCH"}</h6>
                                            </div>

                                        )}
                                    </div>
                                    {/* Fourth-single-services */}
                                    <div className="portfolio-page-collection-inner-header-inner-top">
                                        {singleServicesFourthDisplay ? (
                                            <div className={`portfolio-page-collection-inner-header-inner-top-inner c-pointer ${singleServicesFourthDisplay ? "active" : "div"}`} onClick={returnSingleServicesFourthHandler} >
                                                <h6>{"UNFINISHED"}</h6>

                                            </div>

                                        ) : (
                                            <div className="portfolio-page-collection-inner-header-inner-top-inner c-pointer" onClick={revailSingleServicesFourthHandler}>
                                                <h6 >{"UNFINISHED"}</h6>
                                            </div>

                                        )}
                                    </div>

                                </div>
                                <div className="portfolio-page-collection-inner-single-section container">
                                    <div className={`portfolio-page-collection-inner-single-section-inner  ${singleServicesDisplay ? "" : "show"}`}>
                                    {collectionAll.map((item)=>{
                                        return(
                                            <div key={item.name} className="portfolio-page-collection-inner-single-section-inner-card">
                                              <img src={item.image} alt="" />
                                                <h4>{item.name}</h4>
                                            </div>
                                        )
                                    })} 
                                    </div>
                                    <div className={`portfolio-page-collection-inner-single-section-inner  ${singleServicesSecondDisplay ? "show" : ""}`}>
                                    {collectionWebDev.map((item)=>{
                                        return(
                                            <div key={item.name} className="portfolio-page-collection-inner-single-section-inner-card">
                                                <img src={item.image} alt="" />
                                                <h4>{item.name}</h4>
                                            </div>
                                        )
                                    })} 
                                    </div>
                                    <div className={`portfolio-page-collection-inner-single-section-inner  ${singleServicesThirdDisplay ? "show" : ""}`}>
                                    {collectionWebResearch.map((item)=>{
                                        return(
                                            <div key={item.name} className="portfolio-page-collection-inner-single-section-inner-card">
                                                   <img src={item.image} alt="" />
                                                <h4>{item.name}</h4>
                                            </div>
                                        )
                                    })} 
                                    </div>
                                    <div className={`portfolio-page-collection-inner-single-section-inner  ${singleServicesFourthDisplay ? "show" : ""}`}>
                                    {collectionUnfinishedProject.map((item)=>{
                                        return(
                                            <div key={item.name} className="portfolio-page-collection-inner-single-section-inner-card">
                                                <img src={item.image} alt="" />
                                                <h4>{item.name}</h4>
                                            </div>
                                        )
                                    })} 
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </FrontLayout>
        </div>
    )
}
export default Portfolio