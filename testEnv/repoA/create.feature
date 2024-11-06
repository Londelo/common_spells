@entries-create
Feature: Create entry
  As a user
  I want to be able to create an entry
  for a campaign

  @create-entry-success
  Scenario: Create entry success
    Given I am logged in
    And I create an open campaign
    When I submit an entry
    Then the result matches the entry schema

  @create-entry-success-gate
  Scenario Outline: Create entry success with different gates
    Given I am logged in as a <userType>
    And I create an open campaign with <gateType> gate
    When I submit an entry
    Then the result matches the entry schema

    @paysys
    Examples:
      | userType                        | gateType |
      | user with PaySys wallet         | visa     |

#    @linkedAccount
#    Examples:
#      | userType                                   | gateType              |
#      | tm user with validLinkedTmAccount email    | verizonLinkedAccount  |
#      | tm user with validLinkedTmAccount email    | citiLinkedAccount     |

  @create-entry-success-invite-gate
  Scenario: Create entry success with invite only gate
    Given I am logged in
    And I create an open campaign with inviteOnly gate
    And I write to the invites collection with the userInvite input
    When I submit an entry
    Then the result matches the entry schema

  @registration-s3
  Scenario: Registration is saved to campaignPipeline s3 bucket
    Given I am logged in
    And the s3 bucket campaignDataBucket exists
    And I create an open campaign
    When I submit an entry
    And I wait for avro-encoded records with the validAvroRegistrationData input
    Then the result matches the registrationS3Data schema

  @create-entry-not-eligible
  Scenario Outline: Create entry with no eligibility
    Given I am logged in as a tm user
    And I create an open campaign with <gateType> gate
    When I submit an entry
    Then the result should be a <errorType> error

    Examples:
      | gateType            | errorType     |
      | amex                | NO_CARD       |
      | inviteOnly          | NO_INVITE     |
#      | verizonLinkedAccount| NOT_LINKED    |

  @create-entry-invalid-destination
  Scenario: Create entry invalid destination
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the market field changed to UNKNOWN_MARKET_ID
    Then the result should be a INVALID_DESTINATION_CITY error

  @create-entry-additional-markets
  Scenario: Create entry with additional markets
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the optional_markets field changed to [marketKeys[1], marketKeys[2]]
    Then the result matches the entry schema

  @create-entry-too-many-additional-markets
  Scenario: Create entry with too many additional markets
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the additional_markets_select field changed to [marketKeys[1], marketKeys[2], marketKeys[3]]
    Then the result matches the entry schema

  @create-entry-additional-markets-destination
  Scenario: Create entry with additional market the same as destination
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the additional_markets_select field changed to [marketKeys[0]]
    Then the result should be a DESTINATION_MARKETS_AS_ADDITIONAL error

  @create-entry-additional-markets-duplicate
  Scenario: Create entry duplicate destination markets
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the optional_markets field changed to [marketKeys[1], marketKeys[1]]
    Then the result should be a DUPLICATE_ADDITIONAL_MARKETS error

  @create-entry-unknown-additional-market
  Scenario: Create entry unknown additional market
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the optional_markets field changed to [UNKNOWN_MARKET_ID]
    Then the result should be a UNKNOWN_ADDITIONAL_MARKETS error

  @create-entry-invalid-additional-markets
  Scenario: Create entry invalid additional markets
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the optional_markets field changed to 42
    Then the result should be a INVALID_ADDITIONAL_MARKETS error

  Scenario Outline: Create entry param errors
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the <path> field changed to <editTo>
    Then the result should be a <errorType> error

    Examples:
      | editTo     | path   | errorType      |
      |  undefined | zip    | MISSING_ZIP    |
      |  " "       | zip    | INVALID_ZIP    |

  @create-entry-campaign-not-exist
  Scenario: Create entry campaign does not exist
    Given I am logged in
    And I create a non-existent campaign
    When I submit an entry
    Then the result should be a CAMPAIGN_NOT_FOUND error


  @create-entry-invalid-campaign-id
  Scenario: Create entry invalid campaign id
    Given I am logged in
    And I create an invalid campaign
    When I submit an entry
    Then the result should be a INVALID_CAMPAIGN_ID error

  @create-entry-campaign-closed
  Scenario: Create entry campaign closed
    Given I am logged in
    And I create a closed campaign
    When I submit an entry
    Then the result should be a CAMPAIGN_NOT_OPEN error

  @create-entry-not-logged-in
  Scenario: Create entry not logged in
    Given I am not logged in
    And I create an open campaign
    When I submit an entry
    Then the result should be a NOT_LOGGED_IN error

  @create-entry-empty
  Scenario: Create empty entry fails
    Given I am logged in
    And I create an open campaign
    When I submit an entry modified to be empty
    Then the result should be a REQUIRED_FIELDS_MISSING error

  @create-entry-freeform-errors
  Scenario Outline: Create entry freeform_text preference errors
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the freeform_text field changed to <freeformTextEditTo>
    Then the result should be a <errorType> error

    Examples:
      | freeformTextEditTo    | errorType                                   |
      | undefined             | ENTRY_INVALID_FREEFORM_FIELD                |
      | "min"                 | ENTRY_INVALID_FREEFORM_TEXT_IN_RANGE_MIN    |
      | "MAXIMUM LENGTH"      | ENTRY_INVALID_FREEFORM_TEXT_IN_RANGE_MAX    |

  @create-entry-freeform-non-utf8-success
  Scenario: Create entry handles non-utf8 freeform text successfully
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the freeform_text field changed to "ℕ ⊆ ℕ₀ ⊂"
    Then the "fields.freeform_text" field equals "â â ââ â"

  @create-entry-checklist-errors-invalid-id-value
  Scenario: Create entry invalid checklist preference id value errors
    Given I am logged in
    And I create an open campaign
    When I submit an entry with the checklist field changed to ["invalid-id"]
    Then the result should be an ENTRY_INVALID_CHECKLIST_VAL error

  @create-entry-empty-checklist-required-errors
  Scenario: Create entry empty checklist preference when required errors
    Given I am logged in
    And I create an open campaign with the checklist preference required
    When I submit an entry with the checklist field changed to []
    Then the result should be an ENTRY_EMPTY_CHECKLIST_ID error

  @create-entry-checklist-pref-no-items
  Scenario: Create campaign with checklist preference containing no items errors
    Given I am logged in
    And I create an open campaign with the checklist preference with no items
    When I submit an entry
    Then the result should be a CAMPAIGN_MISSING_CHECKLIST_ITEMS error

  @create-entry-linkedAttributes @paysys
  Scenario: Create entry success with linkable attributes
    Given I am logged in as a user with PaySys wallet
    And I create an open campaign with card_amex,card_citi,card_capitalone linkable attributes
    When I submit an entry
    Then the result should have property "attributes.card_amex"
    And the result should have property "attributes.card_citi"
    And the result should have property "attributes.card_capitalone"

  @create-entry-gate-attributes
  Scenario Outline: Create entry success with gate converted into attribute
    Given I am logged in as a <userType>
    And I create an open campaign with <gateType> gate
    When I submit an entry
    Then the result should have property "<attributeType>"

    @paysys
    Examples:
      | userType                                 | gateType              | attributeType             |
      | user with PaySys wallet                  | visa                  | attributes.card_visa      |

#    @linkedAccount
#    Examples:
#      | userType                                 | gateType              | attributeType             |
#      | tm user with validLinkedTmAccount email  | verizonLinkedAccount  | attributes.linked_verizon |
#      | tm user with validLinkedTmAccount email  | citiLinkedAccount     | attributes.linked_citi    |

  @create-entry-no-linkedAttributes @paysys
  Scenario: Create entry when campaign has no linkable attributes
    Given I am logged in as a user with PaySys wallet
    And I create an open campaign
    When I submit an entry
    Then the result should not have property "attributes.card_amex"
    And the result should not have property "attributes.card_citi"
    And the result should not have property "attributes.card_capitalone"

 @create-entry-no-linkedAccount-gate-attributes @linkedAccount
 Scenario: Create entry when campaign has no linkedAccount gate
   Given I am logged in as a tm user with validLinkedTmAccount email
   And I create an open campaign
   When I submit an entry
   Then the result should not have property "attributes.linked_verizon"
   And the result should not have property "attributes.linked_citi"

  @create-entry-use-user-fields
  Scenario Outline: Validate that the created entry phone/email matches the user account phone/email
    Given I am logged in
    And I create an open campaign <ppc>
    When I submit an entry with the <field> field changed to <editTo>
    Then the "fields.<field>" field <equality> the saved "user.integrations.ticketmaster.<field>" prop

    Examples:
      | ppc               | field | editTo               | equality       |
      | with ppc enabled  | phone | another phone number | does not equal |
      | with ppc enabled  | email | another email        | equals         |
      | with ppc disabled | phone | another phone number | equals         |
      | with ppc disabled | email | another email        | equals         |

  @create-entry-confirmDate-no-ppc
  Scenario: The phoneConfirm date is set to the entry create date when ppc is disabled
    Given I am logged in
    And I create an open campaign with ppc disabled
    When I submit an entry
    And I save the "fields.date.created" prop
    Then the "fields.date.phoneConfirmed" field equals the saved prop

  @create-entry-success-scores
  Scenario Outline: Create entry with phonescore and account fanscore
    Given I am logged in as a tm user
    And I put an item in the dynamodb table <dynamoTable> with the <accountFanscoreRecord> input
    And I put an item in the dynamodb table fanIdentityTable with the validPhonescore input
    And I create an open campaign
    When I submit an entry
    And I pause for 5 seconds to upsert with phone and account fanscore
    And I query for the entry created
    Then the result matches the entry schema
    And the "accountFanscore" field matches the validAccountFanscore result
    And the "phonescore" field matches the validPhonescore result

    Examples:
      | dynamoTable          | accountFanscoreRecord |
      | fanIdentityTable     | fanscoreGlobalUserId  |
      | accountFanscoreTable | fanscoreMemberId      |

  @create-entry-scores-null
  Scenario: Create entry with null accountFanscore and invalid phonescore
    Given I am logged in as a tm user
    And I create an open campaign
    When I submit an entry
    And I pause for 5 seconds to upsert with phone and account fanscore
    And I query for the entry created
    Then the "accountFanscore" field matches the nullValue result
    And the "phonescore.phoneType" field matches the invalidValue result
