const { gql } = require("apollo-server");

const Campaign = gql`
  input RecordClaimsInput {
    account: String!
    claimed_amount: String!
  }

  type RecordStatus {
    status: Boolean
    massage: String
  }

  type Query {
    getClaimableAmount(account: String): String
    verifySignature(account: String, signature: String): Boolean
  }

  type Mutation {
    recordClaims(input: RecordClaimsInput): RecordStatus
  }
`;

module.exports = Campaign;
