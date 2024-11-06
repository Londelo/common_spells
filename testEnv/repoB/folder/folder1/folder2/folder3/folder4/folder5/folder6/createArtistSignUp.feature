@new-reg-entries
Feature: Create new registration entries
  As a user
  I want to be able to upsert entries
  for an artist signup registration campaign

  Scenario: Create new registration entries for users
    Given I am logged in as a supreme user
    And I create 3 users
    And I put items in the dynamodb table fanIdentityTable with the entryUserFanscores input
    And I put items in the dynamodb table fanIdentityTable with the entryUserPhonescores input
    And I create an open campaign
    When I upsert a batch of presale registration entries with the newRegEntries input
    Then the result is of length 3
    And each of the "upserted" field in the results matches the entry schema

  Scenario Outline: Create and update new registration entries
    Given I am logged in as a supreme user
    And I create 3 users
    And I create an open campaign
    When I upsert a batch of presale registration entries with the newRegEntries input
    And I upsert a batch of presale registration entries with the <entries> input
    Then the result is of length <resultLength>
    And I query the entries collection with the upsertedEntries input
    And each item in the result has a "date.fanModified" property matching <isoDate> predicate

    Examples:
      | entries      | resultLength | isoDate        |
      | staleEntries | 0            | isOriginalDate |
      | freshEntries | 3            | isUpdatedDate  |
