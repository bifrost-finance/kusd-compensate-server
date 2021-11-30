import { mergeResolvers } from "merge-graphql-schemas";

import Claims from "./Claims";

const resolvers = [Claims];

module.exports = mergeResolvers(resolvers);
