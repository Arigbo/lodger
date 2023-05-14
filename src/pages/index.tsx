import React from "react";
import FrontLayout from "../layouts/front.layout";
import Portfolio from "./portfolio";
import Service from "./service";
const Home = () => {
    return (
        <div>
            <FrontLayout>
                <div>      <section className="home-page container">
               <div className="home-page-inner">
               <div className="home-page-hero">
                        <div className="home-page-hero-inner">
                            <div className="home-page-hero-inner-right">
                                <div className="home-page-hero-inner-right-text">
                                    <h1><span>J</span>esse<br /><span className="span">A</span>rigbo<span>.</span> </h1>
                                </div>
                                <div className="home-page-hero-inner-right-social">
                                    <div className="home-page-hero-inner-right-social-top">
                                        <h4>WhatsApp</h4>
                                        <h4>LinkedIn</h4>
                                    </div>
                                    <div className="home-page-hero-inner-right-social-bottom">
                                        <h4>Github</h4>
                                        <h4>Twitter</h4>
                                    </div>
                                </div>
                                <input type="submit" value="CONTACT ME" className="btn hug btn-outline-danger"/>
                            </div>
                            {/* <div className="home-page-hero-inner-left"> */}
                            <div className="home-page-hero-inner-left-middle">
                                <i className="fa-solid fa-person"></i>

                            </div>
                            <div className="home-page-hero-inner-left-last">
                                <span>INTRODUCTION</span>
                                <h1>FRONTEND WED DEV</h1>
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit placeat consectetur natus dolore distinctio ullam repellendus sapiente sit quidem similique.</p>
                            </div>
                            {/* </div> */}
                        </div>
                    </div>
               </div>
                </section>
                </div>
            </FrontLayout>
        </div>
    )
}
export default Home