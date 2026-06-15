import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { BrowseFreelancerComponent } from "../../components/landing/browse-freelancers/browse-freelancer.component";


@Component({
    selector: "app-browse-freelancer",
    standalone: true,
    templateUrl: "browse-freelancer.html",
    imports: [CommonModule, BrowseFreelancerComponent]
})
export class BrowseFreelancerPage {

}