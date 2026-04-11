import { PlanState } from "../enum/planstate.enum";

export class Plan {
    id?: string;
    planName?: string;
    planCode?: string;
    description?: string;
    state?: PlanState;
    price?: number;
    features?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    duration?: number;
    priority?: number;
    imageCount?: number;
    videoCount?: number;
    isDeleted?: boolean = false;
    constructor(partial: Partial<Plan>) {
        this.priority = 3;
        this.duration = 30;
        Object.assign(this, partial);
    }

}
export class PlanSchema extends Plan {
    constructor(partial: Partial<PlanSchema>) {
        super(partial);
    }
}