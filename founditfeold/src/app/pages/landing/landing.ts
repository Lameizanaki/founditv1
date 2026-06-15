import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import AOS from 'aos';
import { PopularCategory } from '../../components/landing/popular-category/popular-category.component';
import { Hero } from '../../components/landing/hero/hero.component';
import { HowItWork } from '../../components/landing/how-it-work/how-it-work.component';
import { FeatureFreelancer } from '../../components/landing/feature-freelancer/feature-freelancer.component';
import { WhyChooseFoundit } from '../../components/landing/why-choose-foundit/why-choose-foundit.component';
import { PopularGigs } from '../../components/landing/popular-gigs/popular-gigs.component';
import { StartEarning } from '../../components/landing/start-earning/start-earning.component';
import { LoveByBusiness } from '../../components/landing/love-by-business/love-by-business.component';
import { Footer } from '../../components/landing/footer/footer.component';
import { StartYourProject } from '../../components/landing/start-your-project/start-your-project.component';
import { Header } from '../../components/landing/header/header.component';

@Component({
  selector: 'landing-page',

  imports: [
    CommonModule,
    PopularCategory,
    Hero,
    HowItWork,
    FeatureFreelancer,
    WhyChooseFoundit,
    PopularGigs,
    StartEarning,
    LoveByBusiness,
    Footer,
    StartYourProject,
    Header,
  ],
  standalone: true,
  templateUrl: 'landing.html',
})
export class LandingPage {
  ngAfterViewInit() {
    AOS.init({
      duration: 800,
      once: true,
    });

    AOS.refreshHard();
  }
}
