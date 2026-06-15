import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { SignUpComponent } from "../../components/auth/sign-up.component";

@Component(
    {
        selector: "app-sign-up",
        standalone: true,
        imports: [CommonModule, SignUpComponent],
        templateUrl: "sign-up.html",
    }
)
export class SignUpPage {}