import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChooseRoleComponent } from "../../components/choose-role/choose-role.component";


@Component({
    selector: "app-choose-role",
    standalone: true,
    templateUrl: "choose-role.html",
    imports: [CommonModule, ChooseRoleComponent],
})
export class ChooseRolePage {}