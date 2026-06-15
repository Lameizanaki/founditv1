import { Component } from "@angular/core";
import { SignInComponent } from "../../components/auth/sign-in.component";

@Component({
  selector: "app-sign-in",
  standalone: true,
  imports: [SignInComponent],
  templateUrl: "sign-in.html",
})
export class SignInPage {}