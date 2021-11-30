import { mergeTypes } from "merge-graphql-schemas";

import Claims from "./Claims";

const typeDefs = [Claims];

// NOTE: 2nd param is optional, and defaults to false
// Only use if you have defined the same type multiple times in
// different files and wish to attempt merging them together.
module.exports = mergeTypes(typeDefs, { all: true });
