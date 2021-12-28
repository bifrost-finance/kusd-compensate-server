const { gql } = require("apollo-server");

const Campaign = gql`
  type ClaimableAmount {
    firstClaimableAmount: String
    secondClaimableAmount: String
    theoryCompensation: String
  }

  type ClaimedAmount {
    firstClaimed: String
    secondClaimed: String
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
    getClaimedAmount(account: String): ClaimedAmount
  }

  type Mutation {
    claimCompensation(input: ClaimsInput): RecordStatus
  }
`;

module.exports = Campaign;
