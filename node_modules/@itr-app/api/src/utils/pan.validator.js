import { PAN_REGEX } from "@itr-app/shared-types";

export const isValidPAN  = (pan) => PAN_REGEX.test(pan?.toUpperCase());
export const normalizePAN = (pan) => pan?.toUpperCase().trim();
