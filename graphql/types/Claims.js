const { gql } = require("apollo-server");

const Campaign = gql`
  type ClaimableAmount {
    firstClaimableAmount: String
    secondClaimableAmount: String
  }

  input ClaimsInput {
    account: String!
  }

  type RecordStatus {
    status: Boolean
    massage: String
  }

  type Query {
    getClaimableAmount(account: String): ClaimableAmount
    verifySignature(account: String, signature: String): Boolean
  }

  type Mutation {
    claimCompensation(input: ClaimsInput): RecordStatus
  }
`;

module.exports = Campaign;
