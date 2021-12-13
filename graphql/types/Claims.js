const { gql } = require("apollo-server");

const Campaign = gql`
  type ClaimableAmount {
    firstClaimableAmount: String
    secondClaimableAmount: String
  }

  input ClaimsInput {
    account: String!
    signature: String!
  }

  type RecordStatus {
    status: String
    message: String
  }

  type Query {
    getClaimableAmount(account: String): ClaimableAmount
  }

  type Mutation {
    claimCompensation(input: ClaimsInput): RecordStatus
  }
`;

module.exports = Campaign;
