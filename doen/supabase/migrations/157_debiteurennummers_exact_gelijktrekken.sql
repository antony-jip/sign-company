-- Debiteurennummers gelijktrekken met Exact Online - VOLLEDIG (590 klanten) - DRAAI DIT NA 156
-- Bron: 125-Sign_Company-03-06-2026-CRMAccounts.xlsx (Exact Online, 3 juni 2026)
-- Gegenereerd 22 juli 2026. Organisatie: Sign Company.
--
-- Corrigeert alle 590 klanten die in de Exact-export op naam te matchen zijn.
-- 172 klanten die nu een nummer bezetten dat volgens Exact bij een andere
-- klant hoort, raken hun nummer kwijt (leeg). Zij komen niet in de export voor;
-- controleer via fase-b-vrij-te-geven.csv of dat klopt - de export bevat geen
-- geblokkeerde relaties en geen leveranciers.
--
-- De unieke index klanten_org_debiteurennummer_unique is niet deferrable en geldt
-- alleen waar debiteurennummer <> ''. Daarom eerst alle betrokken nummers leegmaken
-- en pas daarna toekennen: veel klanten wisselen onderling van nummer en zouden
-- anders halverwege op de index stuklopen.
--
-- Draaien in de Supabase SQL Editor. Bij een fout rolt alles terug.

BEGIN;

CREATE TABLE IF NOT EXISTS klanten_debiteurennummer_backup_20260722 AS
  SELECT id, bedrijfsnaam, debiteurennummer, now() AS geback_upt_op
  FROM klanten WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229';

-- Backuptabel met klantgegevens: RLS aan, bewust zonder policy. Daarmee is de
-- tabel via de API voor niemand leesbaar. service_role en de SQL Editor omzeilen
-- RLS, dus terugzetten blijft mogelijk.
ALTER TABLE klanten_debiteurennummer_backup_20260722 ENABLE ROW LEVEL SECURITY;

-- Stap 1: alle betrokken nummers vrijgeven (762 klanten)
UPDATE klanten SET debiteurennummer = ''
WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'
  AND id IN (
    '6c8a8b1c-28b0-4912-a052-0b867fccd103',
    'ca76aa2b-813b-4946-9710-9598591540da',
    '92212f51-afb1-49e4-953a-847a6699bc8a',
    '6643c08d-961e-4c44-9e2b-4cc54e0d7e5c',
    '7dac22ae-d670-4172-af12-c851c85e3671',
    '8dc57e79-e105-4c3c-b92d-3eacec578f66',
    '63a912ea-a0a2-4ff8-b537-f8ec23f1950f',
    'e9bce61a-a66f-4ac8-94bc-6e6b3449962d',
    '3848f0fb-43fc-4fe6-9a02-e7fed2f14367',
    'ff4a6b6e-6370-4aa1-828d-adf13e1a1bb4',
    'c08eadec-84f3-4f32-9346-882a7eb633b2',
    '7e29e1df-fbd5-48ea-8268-066d5c7df1b6',
    '31787131-36bb-4ec7-9ca3-f5dfe637c481',
    'e124e956-a540-4bf8-be06-c672bc8e29bf',
    '7b132253-376e-4e0d-9df4-e33881dd6379',
    '30d092a7-103e-4c28-bc78-2f641370be74',
    '30f3f79d-c799-4bd7-a029-9dbea8a6af11',
    '9dcc541b-d96b-4b20-9ff2-12fbd90d00ac',
    'eb4c630e-6066-45ea-8265-6de8037fd23f',
    'f922d4d8-a873-4c00-add1-36cfdd528b08',
    '66568d14-dc6b-408b-8272-a6db4cf86f85',
    'f94a2452-e2e6-4b5e-b026-b08ef4ce9f66',
    '51e6e199-c192-4c13-bbaf-92454e3397ca',
    '1fd67701-5282-41ef-a8a5-3e0622ec9a9e',
    '5b3c2cbc-bf31-428a-8e82-a6d53920fd99',
    '79728601-2e6a-442f-9130-899e3f5e086e',
    'eb88cfb8-b1e9-4462-8d49-a05a63ef1c51',
    '25fc4bec-3a70-49a8-93e9-de7870495ab2',
    'fdda46bb-3ed2-4f4d-8584-1b53f5c2366a',
    '8a8a1a65-d975-4935-ab00-2e5f5b186dff',
    'b59f275e-a006-4b9d-96ea-927917ca9db5',
    '41b887e7-aed3-471a-adf0-c1cc6d04d3e0',
    '8f547f75-6c53-4a49-95c4-e77694049d36',
    'b4e32d68-f3f0-4901-9484-36c971507f2b',
    '9d62f307-4efa-4741-8cba-662e7900fd21',
    '6701d456-88b4-42a3-ba64-1ead22fe8448',
    '3e75fa1b-6bbc-4eff-93e8-ec1d685bcd47',
    '7577336e-b023-4e14-a336-e5d92311f523',
    '248f2619-f5cb-4dbc-ac63-b99dc0f85078',
    '6888de92-ce93-4809-b481-ded7900818c7',
    'b6a456c5-e583-4609-8bf9-01ac396866d2',
    '0bf7b3dd-b21e-4efa-9a22-abf5ec9f0ef6',
    '487557ac-e892-428e-9cbc-7e5d373cc24e',
    '727bbf4a-71c1-4d1b-9684-6d0551e93a49',
    '521c38cd-10af-49dc-8b34-a1fb14d62665',
    'b4b797ab-e5f6-48d2-b7ec-1133027adf6c',
    '0953f1df-d357-41bb-8c82-a0b6b0cb2673',
    'a0678853-546b-4497-a01b-9e064355494e',
    '68671afc-98fd-4210-9847-b1d199cf395c',
    '97ac452f-fb5f-4b29-9e61-886702e9e07e',
    '18b5044e-fef7-4555-b1f5-66a592a3be2b',
    'd106c731-2acb-46ed-9aba-1774616b99a1',
    '5fae6643-c959-41a6-9259-20f9fd491b18',
    '32730a86-a26a-4e42-b135-e0b6f254a423',
    'f2d9b852-5ce4-4b70-9a84-b107f5f517b3',
    '2e0fa963-d7f0-4606-a493-4556577971bb',
    '16ecee09-cb71-425f-a8d7-02313091d454',
    '5bd12fc8-945b-44b7-8428-cfd8637581cd',
    '79fc0d7c-4c71-47e6-8920-9c58b6976389',
    '111e015b-3bb6-49ec-9eae-e3274abb625d',
    '1630e1e8-ed79-400b-bfd2-3d9dbf80d906',
    '59302399-c034-427c-8572-74cbe89f865e',
    '970abf9c-5170-40aa-b137-32c932189457',
    '91b7f767-243e-4239-a07e-e4f2a6024358',
    'f3ca90ef-15ca-4ae5-bbd1-d2701470db23',
    '5092e1b3-af66-4ecc-af76-3fa48373f3ac',
    '6b50b97e-5ffc-485d-96e9-0abc3de2e183',
    '036d452b-36a5-4d06-b4f6-30a98503b86c',
    '4d09cf36-fec7-46ef-9dfa-d5d7c4efe96a',
    'f166a202-a4d7-404b-847c-59ae734d21d3',
    '7f418521-ed30-4a12-9723-4e9114d506dd',
    '5bd1e99c-25d6-46b2-9a1e-17228e39dcc0',
    '2f569126-9b5d-45d9-a684-9c64359a9808',
    '2d77d771-c6b4-452a-a0c5-0ba4d338637a',
    '144e8d71-0e98-4347-ae0e-12f57dd10f5c',
    '50de6896-0c99-4053-a90a-faf68f69b007',
    'c621c359-4432-4483-91ac-97bd4e6f4a8e',
    '2a1c4ede-bf09-4a05-b116-67bb9a309d67',
    '5b123fec-d744-4375-8d07-621ea4f9874a',
    'e01d9b15-6c23-4523-a327-d6080bd302e9',
    'de679664-dbf5-4570-bda0-f6d9a863d7bf',
    '92f82fb6-332b-48d8-b4ef-f962e4fe9e51',
    '97a92b07-2492-4254-93a5-3a03733ad204',
    'c230798d-e9b4-4a33-8302-e6d07ae181c5',
    '545e92d7-ad94-4ec2-8e72-a4a643f78218',
    '2792ef28-f9a5-454e-b45e-7d4b755cae97',
    '7b047a58-11c1-4541-a7dc-1d945d6c550b',
    'b1c25692-995e-45b7-b0cd-ba431a619b03',
    '40187982-6c5d-41de-bc4c-b519d38155ae',
    '5e9ded31-809e-42a7-b7c2-761868aee410',
    '01dee018-7d02-47b7-bd13-21d29456775b',
    '860d3722-867c-4e17-8bf7-330c835bf29e',
    '2c8e1614-5871-4bb0-a327-1a3c1bd19eef',
    '40b85439-595c-458e-b533-88723e3839ea',
    'fcb1cd7d-caef-4515-b1bc-e710fb95825e',
    '4409c789-8dd5-4ce3-8ed5-06c73262a59c',
    '06a90e72-a0c5-4671-a945-a73440976740',
    '533a0cfc-a425-46d6-885f-26a0e603fb5a',
    '74bbbf14-5f57-4f60-9738-7bd66cea5299',
    '26a59685-76b8-493c-b4b0-3232a6d77c85',
    '2648546b-7ab2-4365-8aa9-5da6c005bfdb',
    '0e83dc3a-a98d-4fac-a1ca-5f54aee3597e',
    '272ecbe2-f698-4452-9dde-ecb07495684d',
    '104c66e6-f864-4e45-a87c-7aa5b199467f',
    '83e04b35-5a21-4f0c-b4bf-b3eafdb968bb',
    'bb8f4afe-8760-419a-926d-c7fa9aedf369',
    'e98ddc1e-dc7c-4bdd-95c4-a25b5c8659f9',
    '48443a6b-9fbf-4736-bb08-5fb5a7361381',
    'd10ae6e6-a6b3-4401-a0e9-351f0cc7c281',
    '28d4f0f5-04c4-430a-a737-0dd255c9d1a8',
    'eb9a84ee-a51b-439d-aa97-5d866ce2cbce',
    '8eb87b5e-9e1d-45fb-abd5-28918aae05f3',
    'c4bca396-d21a-4a9a-bd3d-90e81c8d6be5',
    'e3163626-a7d7-4d21-9cc4-8872d03875d6',
    '65514526-9e7e-49ea-ad34-8e234c20eb60',
    '89b81d9d-9f18-47ba-9100-82c321375159',
    'c72cabee-b01d-441d-80cf-8a5193026b28',
    '92131ddb-f99a-4159-8ea8-8ec7c5985b95',
    '9e94e33f-d5c7-4405-84a1-ee442048be8f',
    '8d0e04e8-2d9c-43a4-890b-4d6f4174c567',
    'a404b8cc-e510-4137-b554-58e4175ff0ef',
    '6cc955f6-556c-4add-ace4-972c39511e84',
    '287a1ba3-7564-4611-8076-9c108d30fbbf',
    '53dcf131-2e06-485b-ab06-7e3f8a008b34',
    '393c78d8-d08a-4af5-8d85-56fa1b261f47',
    'ea6c13f9-e961-49b3-a354-c3182441822f',
    '430020b3-8104-4937-9171-603d743ffed1',
    '4d64eb0d-d9d1-417a-a42c-5eabb6bfbd50',
    '3b432a31-6c00-4f31-800b-a3124ab6476e',
    '04fbfc0a-cd48-4571-9079-7002ee22eb67',
    '1fcc2441-5d86-45ac-b757-a533ff44e560',
    '6d1c73db-eadc-4274-9e9b-d8bada76c724',
    '5a2d34cc-c6a5-4a6d-ac24-e3cd381b12f5',
    'a7d15993-3249-45e7-934c-40b0d094c5ca',
    '344f1ca0-58ba-4b04-aa13-c53e02a9ee1e',
    'b98549f6-b8a3-4a2a-ad08-9ee25b901cef',
    '2702ae6e-068a-4280-9817-bb459a2cd5ce',
    '1ee8e05f-51c0-4d5e-95f6-af36c19d731b',
    '06042bde-3e34-47e2-b3be-266ddef2d2a4',
    '9c119b0c-e27a-47a4-bb1d-ad473f8f21fa',
    'f470e91e-038f-4b0f-81c1-91d141f6d4fb',
    'b45ed2bd-91d3-490b-96f3-a9765ccfd7c3',
    'b38c6150-2a0d-45e5-a14d-be0068014d70',
    '3711653d-00ec-49d1-bc6e-dfcb1798a3a1',
    'af91f46c-da7f-46e7-9207-9b5640c9205a',
    '342351de-4ccc-4076-94f9-8a3c1b617a73',
    'e4f4363b-2cca-4c6a-b955-7291701498c0',
    'ba246e76-777b-4802-b307-0deba20c2a62',
    'efa4e2a1-84c6-4194-aa9d-0749904444e0',
    '04e1fbca-9e0c-4fdb-8b9e-032aa42fc29e',
    '68bcb3b8-cf08-4d04-8a98-8e83fe24f2a7',
    '38460c51-ee1c-48b0-8858-dec71927ef00',
    'cb252fc0-e165-4cb3-a1bc-616617d1e159',
    'f89448f4-fcc6-42a8-98e2-ed68a533343c',
    'a20da275-a491-4cf1-b6be-7285d3ae2cba',
    '4fdd3614-3fa4-4e94-a61d-e469456036bf',
    'f60f334e-210e-4cdf-bc63-087dcdfcd504',
    'aa0d8f98-096a-459d-bfb6-dea1317a944c',
    'e3d4edf8-ac35-45e7-8e71-a48f69b42fe1',
    'e5ed738e-0aa6-4996-a4a7-633a0ca52b04',
    'cc3c1d98-7458-4e55-8bc0-d66625f3acd4',
    '65835a99-9131-45a0-93b4-78787cf620e0',
    '0c25bbf4-4401-4dd4-bcb0-f79b58955fc9',
    '2790bd4c-a18d-4147-880a-f2974927bff1',
    '95a20aec-7fe7-4808-a1dc-beee4bfc210a',
    'ec7459dd-3cfd-4433-936f-d98a1db58757',
    '9d458329-adcc-44ee-b06e-a6d37c38ef16',
    '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751',
    '313f800f-66f8-4ae1-9b9e-63b2ea9e53f4',
    '6d676016-71d0-4147-8e83-b3384f24df23',
    '686c24b4-7028-4cf8-aa68-b500675d5f38',
    '9bd18c97-e28d-477f-b02d-3c0e68249a38',
    '9b6b46d6-b10b-4561-9165-ab125b2e477e',
    'c825ab98-fe06-4ef8-bac4-f80633cddf71',
    'ac370560-9b94-40ef-8738-efa646745b2d',
    'd4482668-02c5-4b11-8c23-4db5f8901be7',
    '17cb70e1-36a5-42eb-9989-b9c537ea2002',
    '13880fe3-5e82-4491-b70e-34ba8568c4ed',
    '612e4b55-edeb-493e-9474-11f6105c01f9',
    '1065ffcf-c377-49a5-9353-ac5b051a1b4b',
    '9466d554-666d-42a5-8ef3-c73e9d748820',
    'f1922662-4312-4f4d-abd8-8b4abdb6b381',
    '1ca7807a-5c7b-48b5-a2ab-4b6367ff7de5',
    'd0511d28-21d7-46a1-a2a8-af9e51c9493b',
    'fbf34013-405e-41d1-a0af-9acac80aec0f',
    '8e793aba-20e4-45bf-9414-2df4b6968715',
    '8fd9cadd-52fe-4903-805b-22773f160cc5',
    '75bc84de-bbb2-481d-a134-eba855565fce',
    '94b4c909-83c1-421e-83be-2dc7e9e0551d',
    '3c4ed447-c14c-46b4-8542-08baa5607529',
    'df6e5a00-004e-4cd1-838c-f2f86a18149a',
    '257e1aef-7f88-47b0-8ca9-bc8b2e829d8a',
    'a0bbd244-818e-41ba-9784-f646267f2ddb',
    'cf4bd664-6b96-4ac8-85c1-87695b972854',
    'db162bb0-1bb3-416b-a394-7e1402bddcb1',
    '84424318-f88f-473c-90e8-9b9547c124c4',
    'd369e33e-7d29-4781-a2cc-8a46d68cbb68',
    'f64d0a92-880e-4d5e-aad0-ff9e7b5752a6',
    'e31e3459-1974-4e6d-a08f-242fe4be0871',
    '60f2b133-f712-4fef-8bfc-842c572b484c',
    'ca3d2bcc-658f-4510-b0f5-721930eda02d',
    '0495537b-4173-4107-8043-ce7ddb9a5e84',
    '4d298ecb-2ad5-49a3-a7cc-486b1075de61',
    '80b6cc95-82a9-4d8e-ab8f-ba51d59b7e64',
    'c49ad38d-bdd1-43c6-8e71-206db8da1b2d',
    '7ec56351-da1d-4b64-924f-bf6a64fe55b6',
    'c93316b4-85c8-4114-86bf-77e8af70253d',
    '81da2c1c-defb-47d4-9559-975d1532908d',
    'adfc92d5-a7a9-449e-ac5f-b4909aeaa63e',
    '263630b3-8cbc-43e3-8675-c9c037f4a72e',
    '4537085e-2f09-49a0-8c62-134dd3f7500c',
    '7ae264fd-77e9-430a-882d-80eead3c9e2b',
    '9d743de4-a184-4516-8d6d-549f40ad32d3',
    '73814fe5-3461-4df6-a6d4-9e1f948f6d78',
    '1f220569-39f9-4a6a-9c6d-e1ceac7fd3c2',
    '655fbb1e-47c7-4dd8-a7f4-5106d67feaed',
    'f456e033-d650-4926-9bc9-80ca9f175123',
    '7e3bbcb5-df43-4629-a860-3dbea297bed2',
    'a32ef520-5a16-4467-b124-5ad220d9c2d0',
    '58e35a3e-f701-46a5-ad5d-ffac6c7147bb',
    'bd559eeb-e82e-4fa2-b3c2-07172208a205',
    '42e25453-d3b5-40fd-8380-ef47835b1490',
    '17d7cc97-aa71-4461-ba64-f83441038c02',
    'c4c2225a-4d20-4bef-8f31-cec6e92f2e8a',
    '5be1889f-fb2b-4298-a7cf-170d7eb9b27a',
    'c85c5b6c-3e61-455a-92de-91d23ac9e665',
    '255b0e9c-2595-4601-8314-c3ff45f9e087',
    'fa9396df-0953-4388-abc1-f8dd5934f3a9',
    '9c70a685-2fd1-4396-9753-bb14597961e9',
    'b9aa6388-d199-4b2b-8593-ae9f748fa8be',
    'b23cf1f9-20d6-4d63-9a95-76e0ed1c4783',
    'accb178e-e5ed-40f4-a91e-a3ad7b0916db',
    '22685023-de0c-4404-8770-e7acf34270ee',
    'a14cd635-9a49-46d6-bcec-0b79d053bbd3',
    '84d9a480-c26d-49df-a6f7-8c4a004491d9',
    'fbbfc358-3d6e-4cc2-81f4-dc33d23a2670',
    'e31d67f6-ee70-4a58-99ad-5d79cc7c8a89',
    '003649f4-9963-4e3e-b58d-ecba1cb06dda',
    'ae9cd055-fb13-4894-bd5e-4142ba9c8ef3',
    '6ff684af-7816-44e5-850a-25941e69136d',
    '4f26856f-f983-44f8-ab4b-d362f6e60be3',
    '38e9b465-0d33-4d3d-9d83-93113eaa216e',
    '9cd75247-cd29-4d42-9319-39b299cb0761',
    '925b65ca-f4fd-4b99-81fa-f1519de59940',
    'c5bf7d19-9ec1-487f-91cc-70616f2ea507',
    '5b74a851-60ab-40cf-957e-18ea5b6d3376',
    '3548e8b7-1625-48ab-a7c2-a259aee7b790',
    '631a2508-acba-4e0a-a8ad-2ef876969c77',
    'f0e1b425-166c-4323-89f4-4faa6ea94393',
    '4cc7425a-8d62-450c-9cfd-98beb793b0ad',
    '35afeae7-f83f-435c-87d5-b793af47c538',
    '5cf78f79-e9dc-466e-9122-b4bebb64e957',
    '41ffabda-d02c-4ed2-b5af-33bfa0600b05',
    '4b3cd76d-4ed9-4d4f-a720-fe85e9a8ec24',
    '58a0b811-3ede-478d-a7fc-d0e830b69a3b',
    'ed758882-593b-49fd-9c4e-e2e857ae6853',
    '83d5e4a2-fc76-4006-a1bc-2c2e0e4405f9',
    '932c3554-dad1-4b3b-877a-424e19af2988',
    'eeaf627d-e87e-4f19-a3b7-659dadb91308',
    '1dddff8c-beea-4a79-8e5b-f0a6da2b8dd2',
    'f77ae4bf-e315-4f8d-9444-0973a0c4761e',
    'a692154e-b854-428d-a1ef-ec8879c60129',
    '8e6ee539-8eee-42b3-8d7f-d3664ed12e6f',
    'ba2ab57e-3ce2-4b5d-a792-f52decbc2022',
    'e8b4ed8b-16f5-4d8e-a9bf-6502bbace780',
    'c60ecb87-2a5e-47fc-a8c7-27e4a5296456',
    '3fb4fcdb-87d5-489b-b51b-17fb89f0f67b',
    '983e2760-6deb-4c8e-87d7-1ecb83d3288b',
    'b9074243-4e1b-4d9e-aeba-8d2eae85b0a5',
    '64475fa5-0aba-4937-9059-ac74db9e50d1',
    '5a366331-e186-40fe-99a5-1b84e2be838d',
    'bf6b1aa9-29a9-4f22-81d9-3b1d552eaa57',
    '6a461659-e14a-4c1a-a1fd-b6083afb7558',
    'e5c46163-1a37-4de6-b602-922d976750ce',
    'd8d33f2b-7276-4732-a115-b88fa16f2eb6',
    '54628b5c-45f7-434a-b588-7bbd8d783460',
    'bd95b035-872a-4a65-9038-1284183cff1d',
    'bf4736cb-332e-41d7-82c1-770aae50d5e3',
    'ae339537-1aee-47fd-8f9e-1ea691eba424',
    '066e0d77-119f-4a34-a187-215c45ce7b5a',
    '5a2e81cc-fc1c-4067-83cd-9255c934f282',
    'bc8b3e33-d378-4401-bb66-fe08c9385ccb',
    '5a7aa5ba-3992-4501-9db8-9cf04f894251',
    '48e968fa-c88a-4ab7-bbc6-71521ed422e2',
    '8ec4a84b-3e96-4580-ba0a-108a68338f6f',
    '3e7e2b28-20b9-4d7a-82e1-ea61b5f55f30',
    '2aab9cc3-7ec1-4ecc-a88a-c76f1671fbb2',
    '69d72dbe-76e7-4cc4-bb8b-7f7716e88282',
    'c1e8382b-a303-44d6-b3ae-72418f264200',
    '473d4e48-6838-45fa-85b2-8f069b157dca',
    '8b7dee90-288e-4e19-b1aa-9eb820a2e53a',
    '50d90f6e-9e07-4257-819d-c8f2b6d3cfee',
    '1e8ab057-cea2-4742-b865-c8b850c0a66b',
    '7300b308-6b40-4f88-afd1-97ea550766d2',
    'ec721f13-e172-469b-873b-a01958d59de1',
    '46834d28-7623-4f3c-bfd9-402a31599b22',
    'cb209d19-0834-4e7c-b13b-cf6f26c2ce0d',
    'd9430a59-5bcc-4e9b-9d2f-f4921a023195',
    '8139a1bc-c2be-44d6-8dd1-2794ae59f9d8',
    '31a4bac9-5d86-40db-b94d-54093fb37577',
    '8b6be129-de86-4405-b55e-babbd0bd2436',
    '91dced9b-9e0f-4253-b9d6-eb8ffee1bd03',
    '9a2e9741-7dc8-44c7-a7ae-062ca2955a63',
    '9c5ea9a2-c28e-4b2e-96ac-17abd58e10ac',
    'db42677f-f969-4082-b5d7-fc91aa1d7c8e',
    'd6d597fd-bdb7-4198-8802-ac9c2169b7b5',
    '75bf581b-7924-4b7c-b7ee-e87cfa888401',
    '0b03314c-578e-40a3-ad49-590d677399db',
    '79c3f8c3-4bd2-4c3c-b1bc-c193bd530773',
    'b7387de4-626c-4151-8986-690b3bb66745',
    'a6d76024-ebef-482b-a263-c3208e293988',
    '4f739630-a2e8-4d20-a6ba-259eb3cbbd34',
    '5376b382-7a07-4b65-aa9b-1791d95be678',
    'e3f1a802-3bb5-4ba4-9b7c-d0b87ab8ae8d',
    '4d95e4af-7941-4498-93b5-8029f16f0607',
    'e8eed407-9a18-4acf-9033-6a6d5a01902d',
    '6734d279-43aa-4599-a41b-92b555116d8a',
    'eb5e4b4f-4e2f-4e96-9b49-941fc8a7e8a1',
    '36931125-b027-427a-a3ab-f5479475cf91',
    '04d008b7-4e10-4193-a97e-da5850b94328',
    '1d892688-b8f7-421c-9ee8-2228223ec391',
    '3859ef5d-bf63-4fa2-be2e-b9791b8b063b',
    '6a3b21c5-d2db-4d58-99a3-8747f488a10d',
    '82f192e9-c09e-4e68-9cb5-12b92fe0aa5e',
    'e6902887-82b4-49d2-8a66-927eb5ec77aa',
    '45b08d3e-a629-40c7-b2ae-10af6d863302',
    '402e607c-80be-48c6-b70c-734fcc2b0ff5',
    '63807f32-1e41-4f5e-9950-17b5840dbe9d',
    '85cd437a-9c0d-46e0-a53d-26c0e1653c8b',
    'ebec7598-aa40-4151-ad39-7fe1fefbed08',
    'b2f62994-9581-46bc-9a12-64dff92c5e41',
    '8f3e7c81-cb8b-49e6-93b1-769a7d51cdd3',
    '63cbbc22-89bf-49fa-b5fc-a75a1c218f70',
    'd1e40d24-fd54-40c3-9ced-a548034c100e',
    'ba0556f3-ad4c-4c39-a64a-2d812792e27c',
    'ef3bae30-c6fd-43b2-badc-12a31e148b14',
    '7757744b-a0ee-4801-be45-f4b02fad0cc8',
    '7cb821ee-2d50-4f98-b8bd-644ad098df03',
    '9f199c7c-8b31-4861-8dcb-84cfe35fbd76',
    'cfc409c4-b951-4b31-9ae4-59b74923f5fc',
    '02a108fa-b0b1-4736-a95d-131c4fec8091',
    '00ba9997-078f-4cc9-898e-e12ddb494d40',
    '0d7a9971-ca6c-4802-a06f-ba30c46cb4b6',
    '27d0e2f6-3d30-4e7b-8267-02eb5112a1b3',
    '8c19451b-4a9b-41ef-ac35-6bd8a39fb1d0',
    '45d017b8-d6b7-42fb-a956-973c4b634bda',
    'e4a2e279-8b0d-461e-8e20-f268c5c2fc6f',
    '91579e55-4ba0-4ebd-8a68-d13d4df2ca57',
    'b2d64964-4414-435a-a000-f6313fead15a',
    '321550c4-0247-4cc9-acc8-9fb56dbb8ed1',
    'baaf70d8-5e55-42b3-837f-e54ac8ad0ad6',
    '2645f396-4b4e-445d-84bc-8c89aef9e0f9',
    'eb5cf722-ad11-4913-881a-381b13d9053a',
    '6f12ec6e-ab16-4a33-8cbc-934c7f2a7721',
    '7e293428-0b69-4242-80a4-f048a8fda09e',
    '290206a4-992a-4fdf-b5a1-617b2a4c2732',
    '9d52c5fc-36b4-4cdf-947a-f6fbe2c6f6bd',
    '2e6d1e48-eccc-4daa-8ab0-0009e64fe348',
    'd16b769a-3b6d-4383-ba1b-04439ed390bd',
    'd9a55171-9baf-43e2-b6d2-a1283ca48697',
    '1a28ec32-99f7-4424-b032-1abc6c5ca6af',
    'bae191c7-3a7c-487c-81f2-a997ef1ca86d',
    'a8caff6b-668e-41d2-ab24-2585dc557069',
    '8ace47e4-4d0d-47f9-803e-7a06d9abe5db',
    '71d3057a-2a6d-439f-a2b9-36131afd9925',
    '1f7687cb-8db1-49e1-8dd7-2839bafb7dc0',
    'b6ea4ff2-0580-49b6-ba43-bba16db6a49d',
    'e59646be-9621-4266-9677-acb0ac60bc98',
    'affd17ad-0143-447b-b9c8-37a1ec8a9f5d',
    'efa5887e-d14a-4066-8e72-ebfcbea1a0fa',
    '10cf42bb-37ea-413f-8018-e86dd60e0f1e',
    '428c8936-0ff4-4d24-9e28-8e1de4d0691a',
    '24c2df98-1905-4b05-87b0-d251531e45ce',
    '3a1e2560-be79-46db-bfd6-99b155951637',
    '0a9c2b42-a967-462f-944c-33d60fd18373',
    '5cfaee79-6249-4a03-9a08-d3adbe77f624',
    'b54f9d50-6cd1-4aae-8f0a-ea1335debdf6',
    '1259b6b2-9c74-4eda-b83c-bb54fe706a4d',
    'f123bab5-f819-4637-b5a9-ec5b95ac6fa1',
    'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf',
    'ca3ab4f3-c8a5-498c-9a16-e4b2b3a6ccf5',
    '2d35d12e-b5a5-4eb3-920f-d5d101f0ad4e',
    '06e918fa-4260-470b-a4e3-f5e87eed1d69',
    '265cdba4-c9fc-4f45-864c-3501308941b5',
    'cbff52da-40f1-4ba3-8543-253e50ef785d',
    '64f0e7be-fae5-4a8e-988e-78213b0211b7',
    '84e83638-aea4-4393-8666-6782819d6218',
    'b9ad45ff-7007-498e-a1f7-cd0c8926cd65',
    'f41d9844-28a0-464f-9272-f10833db8a49',
    '7423c3c6-5f50-48db-8e51-a80994c009ec',
    '9782b7e3-9478-4036-aebc-8cac1bb325c5',
    '608d1dde-4c30-4c37-a6c0-a2dce0b1d500',
    'bf9b2681-dab2-4dc2-aedc-27eaba17c846',
    'dfe3ccd5-fba8-4e4b-9676-12faadc152fd',
    '055d0739-ef5b-47d4-800f-96342d24bcee',
    '05c20b58-0040-4149-bc9b-c4a2b3771cf7',
    '1e20db60-2f41-413c-8631-f81b6da37606',
    '64e2dfa7-a6a8-4701-937f-0c8e9aaab04f',
    'e7189971-6092-4315-8acb-29d27c078794',
    '58d5ce1c-ad5e-4cbf-a798-22d9af4ef93e',
    '80f7d07d-37f7-4f5a-a5d9-6fd8b0d526fd',
    'b5435dae-5c2f-4f84-b66e-5727890dd57f',
    'c0c096ae-6251-4df2-95e3-3faac6a7bc99',
    '1a61c1da-36fb-4fe6-b7ac-92f06b726d91',
    '64d81f1e-e1be-475d-ae64-1ff4e1dac246',
    'b3ad2a03-3e34-47b6-a0dc-950a483ee8da',
    'cee6dc54-6657-4f02-81ea-1cb602dbbdcc',
    'b26ede11-3040-4d63-b0c6-d3d3d17e9961',
    '1c509988-876e-4378-98b0-8143807c90a0',
    'ad725d7f-8ae5-4542-b0a7-c0fb8aa8437a',
    '4cbd92b8-c629-4e11-bdd4-1282d0ab0228',
    '12df7a99-04bb-43b2-b02c-d4b048c01de4',
    'bb01dfc8-e213-4cae-a3b5-c74dfb516127',
    '4989e926-c185-4c2b-8ef1-12403552ae79',
    '44fc3512-926b-4e89-b5ca-ec1aa84d25a0',
    '15756db3-6d54-4818-9218-b801e79d928c',
    'dce73027-354e-4a80-bf87-c23412788176',
    '88cc64ec-1e55-4ede-a66e-6377b481e3ae',
    '5857d580-56cf-4649-87b1-9084e8976474',
    '9cc3ed09-651e-429a-840c-eedb45cc5472',
    'f96652bd-a8f5-479f-bd9e-695abc984e50',
    'bbef853a-7475-4eaa-b40c-0fbd6bb3cb04',
    'caee102e-6640-48e2-a512-bb62de6df477',
    'c907d635-e4f7-46e9-9e25-0569844abb5f',
    '50d6a983-76da-481d-9064-2f15279fa314',
    '00d069f4-7c76-42b3-9798-d7ec8ec72139',
    '59933cf4-916d-4baf-9bcf-825717e6b95a',
    '1a2a47fc-fca5-45a4-8b1b-fa1330bd5923',
    'fb2d3ed9-1ee7-4c00-bd5f-5368e1a00ea1',
    '7a1e3541-fb9b-472f-951f-9805a594dff5',
    '506b1bd6-1c79-4756-a689-bde132ba5826',
    '31fb8db6-c79f-4320-bc6e-1668258eeb20',
    '0bb72777-a953-4905-a985-52b7c60221e6',
    'f10a6431-50e5-435e-bd2a-005da5876a91',
    '07222a1d-f1d4-4fba-a639-79171db3fe9f',
    'daaab841-9e35-4f4b-9e31-e329daa6dbdd',
    'ec5b9a27-b129-4603-97b2-23b49135209c',
    '5870a568-cb1c-45a8-b6bc-62a47d410443',
    'ce10da7a-d8fd-4ad0-8bff-cd06cf22ac1f',
    'bd4832f2-574c-46ad-a028-b5f8f2fa35da',
    '337a8e1d-08a2-4b24-9a83-95be53ff1dc2',
    'c693bd24-e9e5-4a74-b292-24080e298988',
    '07680ae6-47c2-44cc-ac68-e08b52f30505',
    'b9e8e98c-e7d0-440a-901a-3c64a37bc4a0',
    'e9590082-d970-4de1-a369-b1877b4581fa',
    'a7f116f2-6cec-43fc-8fab-4c775c9e12d6',
    'eed01353-4eb0-46e1-9757-9833cdf299e1',
    'f71d3d33-e2b3-4850-8421-1ff1e92b338c',
    'e03ce4c9-4df7-42b6-ac0f-8dcd76011f84',
    '320bb549-9101-436a-8724-6c94b5392cd5',
    'ee6bb587-dc7d-4644-a383-db1ce2b1b0da',
    'a92decf2-e268-42f9-b1fd-67310def7f91',
    '27962fbc-e585-474a-9603-4907356cd9d7',
    'ff105c91-91eb-40bf-b87c-251ca4a06407',
    'b8981b9b-7632-4909-a56c-dc0b97194e8b',
    '3d6ca907-5eac-49bb-a631-8761a68f5fc7',
    '764a4594-0000-411c-9995-debaaa7b157b',
    'e9729f06-6340-4536-a81b-48fc3cc8ebbe',
    'e201aced-ee8a-49b9-a9b9-c112aba30d8d',
    '546fb80e-22f4-4a1e-96a5-d0f9e672066b',
    'eaa71e7a-95d2-4969-924b-ebc815ec9744',
    'db3bd4cd-7ae7-47c2-ba9a-3b7cf2e603ba',
    'dc112b49-f163-465e-b7eb-7d6424cf3bfa',
    '3fde65f9-d7a5-46e6-a598-eeb12397c4cf',
    'e18c98cd-e1cf-433f-8e18-391230f98ee3',
    '8c3c3bbb-7807-4d1b-8bc3-29fa28b4e687',
    'af8a16eb-81a5-4be4-8134-693979ff5f4b',
    '9e94c443-406d-4c17-a54d-c11c82e5b695',
    '630e3de6-8aeb-4025-8819-1569b29da3d9',
    '66abb40d-2fb3-42e9-b814-fdc84db84241',
    'd53a1224-3683-42ed-8019-9696a0b6296f',
    'c4b69af4-281d-442a-b8e3-e8737f9864a5',
    'd0c4b24d-a8a1-4047-aa97-f07d8d1d8c3d',
    'c87cd23c-7d79-4720-9cc3-3ee0df04d144',
    '56d1ee58-169b-4574-9f10-ca93168f3e69',
    '9f4081ba-8098-4525-b719-2a9fbcb86c08',
    '29460779-a20c-4ef4-bbdf-deb8c6455fc7',
    '02e9d168-c42b-4150-927b-3169ab5c0c86',
    '3cf35d1d-101d-4bde-9937-09278e9dbf0f',
    'accf9c3c-690b-4b41-b9c9-eb7f89ee3e7b',
    'b166aeb5-c186-45da-aeb0-5dbe3a327241',
    'b21b1fc1-7bae-446f-8e88-57d7a706ab87',
    '35e9a78b-65fa-47df-974f-f70afa3ec213',
    'ebb35aac-4d15-4cb0-b820-cd2ade8efb29',
    '23c8b478-1f07-4b40-9881-802f11e02c4a',
    'd53a87bc-0690-4d8a-9c32-6425a1f37226',
    '3f88c481-f380-43fb-92b2-e32ff992a0a9',
    '1df03cfc-fe61-45ee-ab6f-9f2118286897',
    'd5a83816-2c94-410e-9350-2f4fb0777f96',
    'a0029618-3c8e-4ceb-82cc-285d5c52416d',
    '6281d122-03bb-49fd-9a13-98c69d5b3cca',
    '31816b59-c936-4bba-84ae-83e91b5b67ca',
    'b497901e-55b8-4cf7-a216-41d388e8f53a',
    '775c9dd2-3398-4110-afb2-9fdeb6f23c14',
    'd496fa5d-85ec-4c99-b1b7-ca9289053d66',
    'df803851-2422-4fff-879b-657565f3a72f',
    '7ee3a376-7645-4321-8924-ffb4b5ebaf88',
    'fbb88086-65c4-429b-a845-14dfd4310908',
    'a2b5c554-ce02-4953-9581-980898d87173',
    '74bf908b-3577-4ed8-a2ca-3328ab84b401',
    '0390a0c8-33ed-4412-b941-f14c2acd4454',
    '33a2e208-9dde-4a22-9bc6-6a943b610df7',
    '034ab8d7-b1ac-4547-aa79-ad6c8aad01d1',
    '021381cb-9e7e-4011-80cc-e9d78f7e568c',
    'cb090eee-b58e-4ff6-8778-b9eea26ab5aa',
    '32800a44-cb3f-4f54-aa1c-1bb18a14dfe4',
    '8339b8e4-36cf-4bff-bb55-15bcc75c3d58',
    '6bf20d93-9cbc-4820-8960-abce78fbe704',
    '18ab9126-3e06-42f2-91fa-3bde6e056364',
    '71698b53-d393-41ff-889e-33c6239a2b34',
    '705b199d-fab6-47e0-8cc2-d548cc8aa30e',
    'baed9b49-509a-4789-9ffb-483abcad6d02',
    'b56f19c4-d407-4543-8f93-f2a9c5617768',
    '9482b75a-73d3-490f-b0e6-b0daed6c0afb',
    'bd174576-e091-4638-adc5-ab13019448af',
    'd88188c5-82d2-4b16-b627-b274eadd6abe',
    'b5a282ee-3b13-4bad-b088-0a68418a91a7',
    '807b5942-788a-4d30-9397-d3870c325aee',
    '1f1a7d81-c68e-475b-a3c9-7a0fe5713ec9',
    '7f8d5730-a8dc-48be-b691-ce5c44f6574d',
    '2c47644f-5118-48c9-94d6-04eaac41cde9',
    '33b971e8-e087-4478-b7ac-768fb2ecdde3',
    '8799ae44-3f06-4bef-9811-f770c0dbfb23',
    '61db0745-32a4-4b7d-bbb6-944e45cc0792',
    '762a218c-3865-4d2b-b96a-5db6fc1dc4dc',
    'bdbc56af-58f0-46ec-8abe-109b0acc43a3',
    'e8567239-9582-4a32-9ef5-9c45a88fa805',
    '3fbdcfb6-1f2d-4e57-9427-e90d63978905',
    'a35fd60a-0e97-49eb-8eef-47af6c354888',
    'b86381b7-798a-496f-902d-71a61e07eac1',
    '895335c9-6b73-4403-98b6-0e61e32e3f6f',
    '6f591f09-4f47-4c7e-8032-0e8ed18f9041',
    '6f88b3fc-a69d-424f-975d-bb3477529170',
    'b34c94b9-c3cd-45ce-8096-5c3582ffbd07',
    '2d1bddeb-1827-4b1c-ae07-87e6ab4ef3de',
    '7fb317be-10f0-4f72-8706-b627518e4565',
    '6a4649df-4d18-453a-91cc-08a100a84164',
    'd04c1262-e550-42ab-86ae-214699316f1a',
    'dbb9bafc-6962-4a6a-8090-068cf486f439',
    'f4b1c67f-df27-42f1-b307-8d8e19d98f29',
    '516decc9-6151-48ac-9643-f0386c3469af',
    'e09e4df7-3106-45a7-bd3b-275d0b038b4b',
    '9c8954e0-67f0-493a-8666-f7f44ef8800d',
    '843d4b54-4781-41d4-bb63-5344c9bd4fa4',
    'cdc64cd6-472b-44b8-9d28-28abd81592fe',
    '48bc853e-d6ea-4a83-b393-0ae24d60ede8',
    '6f0b3a10-6f49-4c6e-af41-c0079b710eab',
    '6a361304-e336-480b-a258-c2426b1ce025',
    '24eb3e94-5fba-4e4f-a5e2-b64d2aa08584',
    '223a8466-a489-40cd-8765-ad303b475311',
    '7118397d-2b1a-4495-8be2-a8a2d5fc778b',
    '181eaa0c-7848-4ad0-bccb-9af5656718e6',
    'b4a180aa-4427-4461-9001-0757f693d579',
    'be75a6de-46f2-4219-a73d-dd9e945118bb',
    'cd48e903-4aa0-47d3-b061-1a78fd1c8f8c',
    '608eb6c3-1850-4ff8-850f-93bc43b54031',
    'b50e3bb8-6d88-4e00-98ec-eaca2f752a8d',
    '6775ea97-1c95-4a18-8944-f69a1e742c2e',
    '68566577-703c-43fe-b7ea-52f217f70e05',
    '1aed3bc9-ad76-4849-93c0-eec795540aad',
    'a42121c2-422c-4002-85f0-6fd0612a07aa',
    'f094f9e9-3220-46db-80e3-4c9cbf060256',
    '395e7cad-2ded-4fda-bb5d-03c6533a187a',
    '0ff82308-9d46-4781-90fa-0949aebab201',
    'c95a97d7-a76c-4f3e-944c-220781c71322',
    'e591b5e4-4ed3-43a3-8e82-9fadd58a43dd',
    'ac2cec57-5fe5-4057-a5e1-f604b295e3e8',
    '82b0749b-d6b9-4ced-bde5-a8792a60cc41',
    '1cacc7f0-077f-4428-ac76-88d955ff8fc1',
    '8ae88dc5-6d25-4f9f-8631-356845e2b21f',
    '746bc663-a51e-48e5-8e7e-4d418237aae5',
    '4ad0d530-f51f-4553-82a6-dbd2056d4d4e',
    '9a166519-a0d8-4c95-8e35-f50223b73fc9',
    '91d1bcc0-2d61-47ba-a00d-ecb1282cbfa6',
    '202f1b30-462b-4635-934f-4e05a05964a4',
    '3e9cc8a2-571f-44e0-9a02-32b1cf37b9de',
    '1f4cfaff-0dd5-4ef0-9968-0dc252ae0e32',
    '59f5a562-7a5e-4326-8124-090886b9338d',
    '976722f4-46f0-4965-991d-f2979833a801',
    '75673d8b-f630-4f42-8d13-4cbc2d4ca5a1',
    '692468a4-d319-4fa7-b5f0-44f3c87e5a1d',
    '7b18124d-f4eb-456f-86e2-d593660a16cb',
    '546c9bbe-4948-42a1-bf37-7fb22e57cf53',
    'e9ed0ab1-dfe4-433b-b2c5-fc22b3c90a5c',
    'f1d03a79-1d6f-4c8e-82fd-e5f33eae7732',
    'd87bc4b2-c34e-492d-804b-e94fcca6dce6',
    '55d60d49-0094-4c6d-9168-783cc8ec3966',
    '5efc9ccf-055d-4208-a06b-b610d88e01b7',
    '9adabb99-734f-4409-973e-b8a3cab30427',
    '32e22542-559e-4edf-a832-2d063105345e',
    '26a183bd-37b1-4c3b-b2c3-6df1a9436482',
    '3974c45b-e857-4f61-b69c-134abbc67080',
    'ef8227eb-5b50-4ae9-be94-4c15120d1196',
    'b5d996bc-29bb-49e7-a47f-3727b99219f1',
    'd3f5acba-5646-478f-b512-d90c2b6f20b0',
    '43b355e2-f84a-4f93-99cb-bc4654987077',
    'beeaaad1-cc58-465b-aaab-b10b7b7a099d',
    '2bd64976-d4fa-4f67-bb66-7a637383b501',
    '730787d4-8dfc-4f7a-881a-e4980c7d0b87',
    'b45c70c7-a05d-4706-9c19-b908e6922ef6',
    '9f96ab2e-9320-418a-a352-49c593109a12',
    '60f49b50-f6e1-4178-a5ba-1710808edc96',
    'ff76e15f-e817-4b5a-8a24-6f183467330a',
    '34b73176-e40c-4c89-a050-645763ab0f8c',
    '47982902-17b9-4710-a9c6-3b33a78a01d3',
    'f8af0ffd-b0c8-4f24-aeb1-3f863dcc3b10',
    '29c85bf8-f51a-4b9c-8b88-912255d091d6',
    '4c4cca85-ce42-4f8f-81c3-51f226648b6d',
    '18be8a0a-ae68-498e-ab6b-527be014d52b',
    '1cc8cdba-4e37-4ee9-aebb-11dda01cbc66',
    '448aa69f-1e11-40ca-88bf-a95705b038ae',
    '7f1de582-abc0-4940-b015-2ae32866e908',
    'db137b15-c822-4c6e-9fb2-563e53377e77',
    'd11d77e8-e4df-495c-8fc3-084503ff3cfc',
    '4cc47406-fb42-4a87-923f-5d7b46ebfa44',
    'c3c4fbb4-432a-4338-8c13-5efca2ef1116',
    'a9b0eb3b-243c-4c54-a4f8-c2f8bda052cd',
    'c93f820b-5c9c-441a-8981-f9728918af3e',
    '7849b9dc-807b-4bce-a4ac-98c2f574602c',
    '9e8fd2a2-684e-4e67-9f85-870ee386de80',
    'fa52937a-5f7c-4934-8f4c-5c76de072da5',
    '555b359e-ddd7-4573-b759-ca1c9370b83f',
    '89203658-169e-4f68-b42b-cb2de375e24b',
    '339025c9-fbb0-4ef8-9f9d-7308dbc3e2ed',
    '6b616463-c755-4255-be69-2c7b4a4435c8',
    '9abf8afa-7ecb-4e3b-b5ce-40a0cff9f9b8',
    '0de4f5df-1f35-462f-859c-80d9ecb55801',
    '80f167ad-2408-47b1-9e24-1424b2205005',
    '3e973be6-6fc7-4733-8589-dc26c19aff08',
    'fd32b567-b28c-431c-bc04-e47d868ff7ff',
    '59f891ad-24bd-4e23-81ae-10af60415008',
    'b8630d71-78b1-450d-848b-b27db4f1f769',
    '443d47d2-e861-4b04-86d3-245b7acecebb',
    '2512e519-20ee-4691-acbd-0614cbd8982a',
    'bfbdcc83-be61-4ad4-9a62-a48ce5bec971',
    'dedf5bc6-f3ed-42ee-b607-5db58b31a8c5',
    '6f9c859b-8f0a-4c24-8e31-00d032177554',
    'fc065a94-61a9-414a-8b2c-51a02175ca8b',
    '77edd8ca-37fa-4303-9983-f9172d1525c9',
    'e9944b4c-f873-409d-ae16-ccf8d7a25f7e',
    '42512d72-da4b-496c-b99b-8bef1e72987f',
    'a02b4181-24e1-420e-abd7-a86d97352081',
    'cf1b88e6-4090-418c-8ea0-086ce8b4a608',
    '07a087ae-e67e-4fe3-a15e-bddbc924b09a',
    '2e660a43-178d-4bb6-b97c-02e8586aa7b6',
    '8a31c9a0-fe91-4e40-90ff-70b0263daa21',
    '4420e566-fc6c-4209-b9bc-b702c35739d5',
    '31ab47a8-3556-481d-8ff4-75d507555da4',
    'bcf5a2d3-9c1d-4d5c-a2cc-509b0d3c2958',
    'bb3ecc54-d566-4cb8-ace1-2263ef59aeb5',
    '7c7d2a20-c7b6-45e1-a7e4-32122056e700',
    'a080a4ff-e1ca-4996-8321-203ac15565f3',
    'bf3c2296-4e19-48c3-a803-e87d8222ea9d',
    '69f739fa-87ba-47f5-8f96-17caae0d45b5',
    '8f99e406-348e-461d-8a05-43f38a783a07',
    '43cfae60-caf0-4205-a2a2-502960388bf0',
    '85490323-f2ac-4030-8edc-2273be231a76',
    '70a1dad5-1933-4caf-901d-21863be44aec',
    'c4e285c1-37e1-498f-a65d-73e4764dc3ab',
    '8a284fd0-f0fc-4a92-99e8-58eb2ce4d57c',
    '2083d204-ae87-4a1b-8027-e67f91056186',
    '7cfecce7-cd6c-4e5d-b53e-0ec16e0ad626',
    '4999cd3f-fe6e-4066-a8dc-dc435396f232',
    'd95e0ec5-15a6-48e9-a37a-53fabcf56095',
    '5caf8e73-f2d3-4513-9946-56f5f774901a',
    '420aadef-24f9-4dd3-b894-8de0362ecbfd',
    '59db7cf1-46ad-4364-8678-045fdf136f40',
    '0631e285-6188-4513-9a10-c804e4f8dfb5',
    '1d726e0d-242a-4dc6-9e7f-aaee89007596',
    '9d724611-e505-47a7-9dea-146a781053a5',
    '76424d86-e7a8-4e0d-9afe-5bc8d4292b98',
    '12fcccf9-788c-4779-92c0-21127b6cbe1c',
    '81892ab6-568a-482e-a480-68a0a4ac3cd4',
    'fbe7fee3-82ed-42b0-a04a-8b69cddd3c3f',
    'a5d08488-9c8f-43e7-b9c3-070afd87fe88',
    'bb3de07a-fdce-4879-8e9e-bdf83d8a1873',
    'b4b26fe7-3c15-494a-bc7d-a38f053c0bda',
    'eb0a13bf-655f-433f-b062-58a162017da5',
    '0e5f02c3-1a7e-4dd4-8ce8-f9f933070ce9',
    '7b024305-85f2-449a-9144-8b0e84b08d47',
    '08d6b407-7da7-4500-9170-4e4ca4835ed4',
    '4c3d9d5e-d284-4d56-a302-77dfaafe219d',
    '16ec0236-4776-4680-867a-b7ecaaaf2b99',
    '7d348a87-1f49-4b70-a80d-301ef1b006e5',
    '7501aa8e-bb45-4d3c-a0cb-b1734042b371',
    '6dc6d225-6fda-42b6-b1db-b7badf8f9403',
    '12b4f8ae-8ace-481d-90ce-c518b3d20b1e',
    '5666f18d-8436-47be-8eaf-e5a8637f9afa',
    '7a80f796-455c-4634-b89c-db80317e15e0',
    'ff248def-1016-4f72-a5c9-f899645e61c7',
    '6a721765-030c-48a8-a8b5-733a68773a4f',
    '85c6f892-035d-41de-9fa5-7a65d502744e',
    '36d4289c-a594-4090-ad77-805f9c36edfb',
    '6561d8ec-9b8e-48a3-8cc4-22d61666b9df',
    '7fd9882c-9e5e-4009-87de-eedfcf130ffd',
    '1bd890a3-14d4-4b88-99fc-a12626eec5ca',
    '6d138444-9a2f-4ecc-b31e-200ba158b3d6',
    'b5b8530b-4fc3-41bf-8155-5e38701efabc',
    '1e5aadd5-3d61-4d51-8bbb-56b5b3993e71',
    '2d1d6e3d-a26d-4400-8416-bcce51c5b185',
    '0008882d-ab96-4815-9219-39503cd5d793',
    '65489351-9b36-4d82-b228-709da8647bae',
    'bc9ae1e3-808c-4e12-9267-df8a4287d103',
    '53987906-73c1-4e6a-a34e-4751eb1a111c',
    'c1f95eea-44ea-4309-914b-ec912f7ee812',
    '52e40997-5931-461e-b2ce-a3a2e0618a6e',
    '1ed883aa-72da-40ea-95b9-49695abe1265',
    'fac6db05-2090-421d-b4bd-f4eb57119ce8',
    '20edfb74-1fc0-4c52-90cb-e33be01f85d5',
    '4003276f-2b5a-471d-90f8-de4bd1140673',
    '9e6f87d7-7ec8-4e9b-91fe-d572aa0b0a5b',
    '01ace46d-106c-4f71-837f-cc5c4b9b21dc',
    '19256b26-770e-4d5b-a38b-f612dbbf6ded',
    '9e35283c-5b64-45b8-924d-e41cb73450cc',
    'd6c687e3-5e7c-436b-ba5f-b04e08039860',
    '6d1316fe-9f4d-4c88-8298-e0d5f9eab5b8',
    '5e7a6085-0ad7-4171-8ace-6cef5441690a',
    'fabc9b40-11a4-419b-8562-9561998d42d1',
    'dcd4a7d3-b9c8-41c3-a6d9-54a3daf3123f',
    '3c18628e-f2ef-4e4d-a12e-5f535ec9661b',
    '5833dc9d-c3c4-4f3d-bf2d-48a6dc38d60d',
    '04920d78-8f13-4f1c-9789-596eff99a29d',
    'ec9ab69b-221b-4ae8-b0b3-6e128e9798c9',
    '27059180-28ae-49b7-8ffe-690a118052e6',
    'b4e02157-a7db-451d-8a74-d3c812a50b11',
    '98d1fd08-ed02-4599-aa31-01e78fdebc60',
    'ff3d1ee5-6868-407d-86f8-cc58581c22a9',
    '7b309a58-8157-4bf4-a5e2-4287e23586c8',
    '4914f9d7-3969-4192-af1e-664df081f194',
    '7d6606ae-45ca-4a42-9fad-1d245fb2cfef',
    '011f46e5-f9a8-4dd6-ac75-f06f901c8378',
    '57976ef9-b12c-4939-aa22-f09c9b095b8b',
    '117cd6a7-9482-43a8-81a7-928faa782cd5',
    'd190b4ea-6fb3-4861-9149-c639356ceb7e',
    '3a95e68e-757f-476d-a1af-4299f69de1ef',
    '82ad29cd-1d0c-4f53-babd-54cfaadc31bd',
    '8621c176-4e33-45b2-9523-bda220c8b0a5',
    'd674528c-9de5-45e5-b66d-4c3ca3182fde',
    '0876e0d0-f2ef-43e9-9fa8-328e0a76abd0',
    'ccad9cac-8c4c-47f0-9929-4c62a25ff38e',
    'eee831c9-b376-4e2e-afd8-63de33a4b45c',
    'f868fad9-bb15-46ad-aa86-131bd550fd61',
    'e90b83be-bcb3-48d2-b3ff-8e45d5d9beee',
    '7decc5af-aa96-494a-b812-10c8cdd52bd4',
    '30101cb7-97c9-49dc-b219-36e9f781220f',
    '4f8c9bfe-559f-4b47-8a18-c34c8088f9f4',
    '8277db93-e5ad-4804-8921-d7a858d464f7',
    'e1a22feb-b581-4b7f-a85b-a9cd53b3ee09',
    'f573c341-a08f-47c2-9f8f-fd47e7b87ed9',
    'd11382fa-983a-45d7-a5d3-8ed82f81e1f0',
    '949504ae-83a1-4a09-a6e7-fd096cf3264c',
    'f0ce35fc-30e7-450a-ac6f-56e0149b8a8e',
    '4296d321-acdd-418b-b362-3d1b01f61639',
    '3874ba79-1322-4abf-9a57-bba6c189307f',
    '922c24cd-2687-4dc1-a09f-701d117f5d7d',
    'e451dc8e-35ea-4965-be3d-d63b71575e64',
    '6b7f9944-d5b9-4cfb-a6a8-1282ad3ad155',
    '43705492-107e-483e-ac5f-73c8612ac45a',
    'f2d30643-e18d-4ce6-bc90-6881471e7a49',
    'b6aecef0-4f80-49b3-9854-9c1610985a2b',
    '84f3bc17-9f5d-4a90-a8e0-53661ade1611',
    'dbc9825b-fae9-4eb8-994f-5b286c01cfa2'
  );

-- Stap 2: Exact-nummer toekennen (590 klanten)
UPDATE klanten SET debiteurennummer = '503822' WHERE id = '4537085e-2f09-49a0-8c62-134dd3f7500c';  -- 2DV (was 503986)
UPDATE klanten SET debiteurennummer = '20190648' WHERE id = '104c66e6-f864-4e45-a87c-7aa5b199467f';  -- 3Kwartier (was 504379)
UPDATE klanten SET debiteurennummer = '504060' WHERE id = '5b123fec-d744-4375-8d07-621ea4f9874a';  -- A.B.K. Occasion Outboard Supplies (was 503781)
UPDATE klanten SET debiteurennummer = '503313' WHERE id = 'a42121c2-422c-4002-85f0-6fd0612a07aa';  -- Aannemersbedrijf Hoes (was 503732)
UPDATE klanten SET debiteurennummer = '20190641' WHERE id = '06042bde-3e34-47e2-b3be-266ddef2d2a4';  -- AB - BV (was 504363)
UPDATE klanten SET debiteurennummer = '503861' WHERE id = 'd369e33e-7d29-4781-a2cc-8a46d68cbb68';  -- Abate (was 503951)
UPDATE klanten SET debiteurennummer = '504135' WHERE id = 'eaa71e7a-95d2-4969-924b-ebc815ec9744';  -- Abbekerk Metselwerken (was 503711)
UPDATE klanten SET debiteurennummer = '503743' WHERE id = '38e9b465-0d33-4d3d-9d83-93113eaa216e';  -- ABS Buntsma Autoschade (was 504063)
UPDATE klanten SET debiteurennummer = '504106' WHERE id = '895335c9-6b73-4403-98b6-0e61e32e3f6f';  -- ACS Klimaattechniek (was 503739)
UPDATE klanten SET debiteurennummer = '503593' WHERE id = '6a3b21c5-d2db-4d58-99a3-8747f488a10d';  -- AD Service (was 504205)
UPDATE klanten SET debiteurennummer = '503724' WHERE id = 'bae191c7-3a7c-487c-81f2-a997ef1ca86d';  -- Ads Pro (was 504081)
UPDATE klanten SET debiteurennummer = '504004' WHERE id = '92131ddb-f99a-4159-8ea8-8ec7c5985b95';  -- Advanced Sonis Monitoring (was 503832)
UPDATE klanten SET debiteurennummer = '504102' WHERE id = '23c8b478-1f07-4b40-9881-802f11e02c4a';  -- Aemstelstadt B.V. (was 503743)
UPDATE klanten SET debiteurennummer = '20190583' WHERE id = '775c9dd2-3398-4110-afb2-9fdeb6f23c14';  -- AH 8693 Enkhuizen BV (was 503903)
UPDATE klanten SET debiteurennummer = '503892' WHERE id = 'c4bca396-d21a-4a9a-bd3d-90e81c8d6be5';  -- Aim for the head (was 503927)
UPDATE klanten SET debiteurennummer = '504138' WHERE id = '0bb72777-a953-4905-a985-52b7c60221e6';  -- Air-Concepts B.V. (was 503708)
UPDATE klanten SET debiteurennummer = '504239' WHERE id = 'bd4832f2-574c-46ad-a028-b5f8f2fa35da';  -- Airo Design B.V. (was 503612)
UPDATE klanten SET debiteurennummer = '2150327' WHERE id = '6d1c73db-eadc-4274-9e9b-d8bada76c724';  -- Albert Heijn (was 504301)
UPDATE klanten SET debiteurennummer = '504378' WHERE id = '727bbf4a-71c1-4d1b-9684-6d0551e93a49';  -- Aldu bevestigingsmaterialen (was 503485)
UPDATE klanten SET debiteurennummer = '503667' WHERE id = '1d892688-b8f7-421c-9ee8-2228223ec391';  -- Alex''s Onderhoudsbedrijf (was 504135)
UPDATE klanten SET debiteurennummer = '503972' WHERE id = 'cd48e903-4aa0-47d3-b061-1a78fd1c8f8c';  -- Aline Hogenberg (was 503862)
UPDATE klanten SET debiteurennummer = '503966' WHERE id = '034ab8d7-b1ac-4547-aa79-ad6c8aad01d1';  -- Allround Yachting (was 503868)
UPDATE klanten SET debiteurennummer = '504259' WHERE id = '248f2619-f5cb-4dbc-ac63-b99dc0f85078';  -- Andre Nijboer (was 503593)
UPDATE klanten SET debiteurennummer = '503654' WHERE id = 'baaf70d8-5e55-42b3-837f-e54ac8ad0ad6';  -- Annette''s fashion corner (was 504148)
UPDATE klanten SET debiteurennummer = '504082' WHERE id = '24eb3e94-5fba-4e4f-a5e2-b64d2aa08584';  -- Anticimex Operations B.V. (was 503762)
UPDATE klanten SET debiteurennummer = '503589' WHERE id = '6f12ec6e-ab16-4a33-8cbc-934c7f2a7721';  -- Aquastop Witgoed Service (was 504208)
UPDATE klanten SET debiteurennummer = '503487' WHERE id = '5376b382-7a07-4b65-aa9b-1791d95be678';  -- ARPS Creatie (was 504302)
UPDATE klanten SET debiteurennummer = '504059' WHERE id = '223a8466-a489-40cd-8765-ad303b475311';  -- ASN Autoschade Service Hoorn B.V. (was 503782)
UPDATE klanten SET debiteurennummer = '504120' WHERE id = '4cbd92b8-c629-4e11-bdd4-1282d0ab0228';  -- Atres Center BV (was 503725)
UPDATE klanten SET debiteurennummer = '504236' WHERE id = '9e94c443-406d-4c17-a54d-c11c82e5b695';  -- Auto Advies Sharif (was 503615)
UPDATE klanten SET debiteurennummer = '503663' WHERE id = '3711653d-00ec-49d1-bc6e-dfcb1798a3a1';  -- Auto Service Enkhuizen (was 504139)
UPDATE klanten SET debiteurennummer = '503951' WHERE id = '71698b53-d393-41ff-889e-33c6239a2b34';  -- Auto Tensen Enkhuizen (was 503881)
UPDATE klanten SET debiteurennummer = '503529' WHERE id = 'c60ecb87-2a5e-47fc-a8c7-27e4a5296456';  -- Autobedrijf De Dijk (was 504263)
UPDATE klanten SET debiteurennummer = '504381' WHERE id = 'b59f275e-a006-4b9d-96ea-927917ca9db5';  -- Autobedrijf van Laar (was 503482)
UPDATE klanten SET debiteurennummer = '504363' WHERE id = 'bbef853a-7475-4eaa-b40c-0fbd6bb3cb04';  -- Autoschade Schepenwijk (was 503500)
UPDATE klanten SET debiteurennummer = '503826' WHERE id = '42e25453-d3b5-40fd-8380-ef47835b1490';  -- Autoschade Zuiderkogge (was 503982)
UPDATE klanten SET debiteurennummer = '503976' WHERE id = '33a2e208-9dde-4a22-9bc6-6a943b610df7';  -- Avalon Schip (was 503858)
UPDATE klanten SET debiteurennummer = '503798' WHERE id = 'c85c5b6c-3e61-455a-92de-91d23ac9e665';  -- B5-Consult bv (was 504010)
UPDATE klanten SET debiteurennummer = '504037' WHERE id = 'd88188c5-82d2-4b16-b627-b274eadd6abe';  -- Bakker Internationaal Koeltransport B.V. (was 503804)
UPDATE klanten SET debiteurennummer = '503281' WHERE id = '393c78d8-d08a-4af5-8d85-56fa1b261f47';  -- Bakkerij Westers (was 50226)
UPDATE klanten SET debiteurennummer = '503706' WHERE id = 'accb178e-e5ed-40f4-a91e-a3ad7b0916db';  -- Bakkum Bikes (was 504099)
UPDATE klanten SET debiteurennummer = '503739' WHERE id = 'b2f62994-9581-46bc-9a12-64dff92c5e41';  -- Balk Wervershoof BV (was 504066)
UPDATE klanten SET debiteurennummer = '503898' WHERE id = '6cc955f6-556c-4add-ace4-972c39511e84';  -- Bas Koeting Racing BV (was 503922)
UPDATE klanten SET debiteurennummer = '503942' WHERE id = '6a4649df-4d18-453a-91cc-08a100a84164';  -- Basix Living (was 503889)
UPDATE klanten SET debiteurennummer = '503620' WHERE id = '3e9cc8a2-571f-44e0-9a02-32b1cf37b9de';  -- Bauk Holwerda Meubelkunst & Design (was 504179)
UPDATE klanten SET debiteurennummer = '503803' WHERE id = 'adfc92d5-a7a9-449e-ac5f-b4909aeaa63e';  -- Beachy Vlieland (was 504005)
UPDATE klanten SET debiteurennummer = '503749' WHERE id = 'ebec7598-aa40-4151-ad39-7fe1fefbed08';  -- Beauty Parlour (was 504057)
UPDATE klanten SET debiteurennummer = '50923' WHERE id = '0495537b-4173-4107-8043-ce7ddb9a5e84';  -- Bedijs (was 503935)
UPDATE klanten SET debiteurennummer = '503859' WHERE id = 'f3ca90ef-15ca-4ae5-bbd1-d2701470db23';  -- Beerepoot Automatisering (was 503953)
UPDATE klanten SET debiteurennummer = '504291' WHERE id = 'ee6bb587-dc7d-4644-a383-db1ce2b1b0da';  -- BeKind By Barbara (was 503564)
UPDATE klanten SET debiteurennummer = '504185' WHERE id = '66abb40d-2fb3-42e9-b814-fdc84db84241';  -- Benno Wals Agrarische Bemiddeling (was 503665)
UPDATE klanten SET debiteurennummer = '503887' WHERE id = '287a1ba3-7564-4611-8076-9c108d30fbbf';  -- Berkhout Watersport (was 503932)
UPDATE klanten SET debiteurennummer = '503912' WHERE id = 'cf4bd664-6b96-4ac8-85c1-87695b972854';  -- Bess Dakwerken (was 503911)
UPDATE klanten SET debiteurennummer = '504066' WHERE id = 'bdbc56af-58f0-46ec-8abe-109b0acc43a3';  -- BeterGevel B.V. (was 503776)
UPDATE klanten SET debiteurennummer = '504303' WHERE id = 'ec5b9a27-b129-4603-97b2-23b49135209c';  -- Bistro op 3 (was 503552)
UPDATE klanten SET debiteurennummer = '504070' WHERE id = 'c72cabee-b01d-441d-80cf-8a5193026b28';  -- Bleeker timmerbedrijf (was 503772)
UPDATE klanten SET debiteurennummer = '503796' WHERE id = 'c4c2225a-4d20-4bef-8f31-cec6e92f2e8a';  -- Bonnes Partners (was 504012)
UPDATE klanten SET debiteurennummer = '504310' WHERE id = '3fde65f9-d7a5-46e6-a598-eeb12397c4cf';  -- Boon Export B.V. (was 503545)
UPDATE klanten SET debiteurennummer = '503993' WHERE id = '6281d122-03bb-49fd-9a13-98c69d5b3cca';  -- Bourguignon Schadeherstel B.V. (was 503843)
UPDATE klanten SET debiteurennummer = '503514' WHERE id = '2e6d1e48-eccc-4daa-8ab0-0009e64fe348';  -- Bouwbedrijf Smit (was 504277)
UPDATE klanten SET debiteurennummer = '504296' WHERE id = '12df7a99-04bb-43b2-b02c-d4b048c01de4';  -- BoXpoint (was 503559)
UPDATE klanten SET debiteurennummer = '504020' WHERE id = '843d4b54-4781-41d4-bb63-5344c9bd4fa4';  -- BRC Chaletbouw (was 503817)
UPDATE klanten SET debiteurennummer = '504019' WHERE id = 'a2b5c554-ce02-4953-9581-980898d87173';  -- Broekhuis Enkhuizen (was 503818)
UPDATE klanten SET debiteurennummer = '504219' WHERE id = '337a8e1d-08a2-4b24-9a83-95be53ff1dc2';  -- Broerse Stucadoorsbedrijf (was 503632)
UPDATE klanten SET debiteurennummer = '503564' WHERE id = 'e59646be-9621-4266-9677-acb0ac60bc98';  -- Broersen en van der plasse B.V. (was 504230)
UPDATE klanten SET debiteurennummer = '503642' WHERE id = '546c9bbe-4948-42a1-bf37-7fb22e57cf53';  -- Broersen Glas & montage (was 504158)
UPDATE klanten SET debiteurennummer = '504026' WHERE id = 'd5a83816-2c94-410e-9350-2f4fb0777f96';  -- Bubbels (was 503813)
UPDATE klanten SET debiteurennummer = '504147' WHERE id = '31fb8db6-c79f-4320-bc6e-1668258eeb20';  -- Building Creations B.V. (was 503700)
UPDATE klanten SET debiteurennummer = '503968' WHERE id = '3fbdcfb6-1f2d-4e57-9427-e90d63978905';  -- Buis Totaal Techniek (was 503866)
UPDATE klanten SET debiteurennummer = '504365' WHERE id = 'e7189971-6092-4315-8acb-29d27c078794';  -- Bulkschroeven.nl (was 503498)
UPDATE klanten SET debiteurennummer = '503711' WHERE id = '932c3554-dad1-4b3b-877a-424e19af2988';  -- Bureau voor Vernieuwing (was 504094)
UPDATE klanten SET debiteurennummer = '503647' WHERE id = 'f77ae4bf-e315-4f8d-9444-0973a0c4761e';  -- BuzzardEye (was 504154)
UPDATE klanten SET debiteurennummer = '504299' WHERE id = '1259b6b2-9c74-4eda-b83c-bb54fe706a4d';  -- C.N.B. (was 503556)
UPDATE klanten SET debiteurennummer = '503815' WHERE id = 'f094f9e9-3220-46db-80e3-4c9cbf060256';  -- Cafe De Roode Leeuw (was 503993)
UPDATE klanten SET debiteurennummer = '503493' WHERE id = 'd9a55171-9baf-43e2-b6d2-a1283ca48697';  -- Café Lange Jan (was 504297)
UPDATE klanten SET debiteurennummer = '50742' WHERE id = '04fbfc0a-cd48-4571-9079-7002ee22eb67';  -- Camping Broekerhaven (was 41232)
UPDATE klanten SET debiteurennummer = '504141' WHERE id = '05c20b58-0040-4149-bc9b-c4a2b3771cf7';  -- Caravancentrum Venhuizen (was 503705)
UPDATE klanten SET debiteurennummer = '503949' WHERE id = '970abf9c-5170-40aa-b137-32c932189457';  -- Carlos bikes (was leeg)
UPDATE klanten SET debiteurennummer = '503587' WHERE id = '7300b308-6b40-4f88-afd1-97ea550766d2';  -- Carolien v.d. Schoot (was 504210)
UPDATE klanten SET debiteurennummer = '2150300' WHERE id = '1fcc2441-5d86-45ac-b757-a533ff44e560';  -- Catunambu Nederland B.V. (was 50847)
UPDATE klanten SET debiteurennummer = '504273' WHERE id = '83e04b35-5a21-4f0c-b4bf-b3eafdb968bb';  -- CBRE GWS Integrated Facility Management B.V. (was 503581)
UPDATE klanten SET debiteurennummer = '503536' WHERE id = '003649f4-9963-4e3e-b58d-ecba1cb06dda';  -- Cees Verhoef (was 504258)
UPDATE klanten SET debiteurennummer = '503483' WHERE id = '2aab9cc3-7ec1-4ecc-a88a-c76f1671fbb2';  -- Centre Hotels (was 504306)
UPDATE klanten SET debiteurennummer = '503542' WHERE id = '79c3f8c3-4bd2-4c3c-b1bc-c193bd530773';  -- Centrum Oosterwal (was 504252)
UPDATE klanten SET debiteurennummer = '504079' WHERE id = '1f1a7d81-c68e-475b-a3c9-7a0fe5713ec9';  -- cepezedbouwteam (was 503765)
UPDATE klanten SET debiteurennummer = '503558' WHERE id = '5a7aa5ba-3992-4501-9db8-9cf04f894251';  -- Chantal Aker (was 504236)
UPDATE klanten SET debiteurennummer = '504108' WHERE id = '5b3c2cbc-bf31-428a-8e82-a6d53920fd99';  -- Chaser Yachts (was 503737)
UPDATE klanten SET debiteurennummer = '503857' WHERE id = '80b6cc95-82a9-4d8e-ab8f-ba51d59b7e64';  -- Cinema Enkhuizen (was 503955)
UPDATE klanten SET debiteurennummer = '503597' WHERE id = 'f0e1b425-166c-4323-89f4-4faa6ea94393';  -- City Hotel de Jong (was 504202)
UPDATE klanten SET debiteurennummer = '504115' WHERE id = '56d1ee58-169b-4574-9f10-ca93168f3e69';  -- Cleine Zorgprofessionals (was 503730)
UPDATE klanten SET debiteurennummer = '503637' WHERE id = 'a6d76024-ebef-482b-a263-c3208e293988';  -- CMK Makelaars (was 504163)
UPDATE klanten SET debiteurennummer = '503777' WHERE id = '4f26856f-f983-44f8-ab4b-d362f6e60be3';  -- Coco Coiffures (was 504030)
UPDATE klanten SET debiteurennummer = '503612' WHERE id = '066e0d77-119f-4a34-a187-215c45ce7b5a';  -- Coffeeshop de Poort (was 504187)
UPDATE klanten SET debiteurennummer = '503470' WHERE id = '3b432a31-6c00-4f31-800b-a3124ab6476e';  -- Color Life beautiful (was 504318)
UPDATE klanten SET debiteurennummer = '504336' WHERE id = '0953f1df-d357-41bb-8c82-a0b6b0cb2673';  -- Colorworks International (was 503525)
UPDATE klanten SET debiteurennummer = '20190529' WHERE id = '7cb821ee-2d50-4f98-b8bd-644ad098df03';  -- Communicatiekanjers (was 504196)
UPDATE klanten SET debiteurennummer = '503760' WHERE id = '4d95e4af-7941-4498-93b5-8029f16f0607';  -- Compleet Duurzaam (was 504046)
UPDATE klanten SET debiteurennummer = '504285' WHERE id = 'f96652bd-a8f5-479f-bd9e-695abc984e50';  -- Corax Schildersbedrijf (was 503570)
UPDATE klanten SET debiteurennummer = '503617' WHERE id = '3548e8b7-1625-48ab-a7c2-a259aee7b790';  -- Corlido Project Supply B.V. (was 504182)
UPDATE klanten SET debiteurennummer = '40050' WHERE id = 'b9074243-4e1b-4d9e-aeba-8d2eae85b0a5';  -- CortieBouw (was 504018)
UPDATE klanten SET debiteurennummer = '504038' WHERE id = '1df03cfc-fe61-45ee-ab6f-9f2118286897';  -- Createq B.V. (was 503803)
UPDATE klanten SET debiteurennummer = '503719' WHERE id = '63cbbc22-89bf-49fa-b5fc-a75a1c218f70';  -- CrossLink (was 504086)
UPDATE klanten SET debiteurennummer = '503900' WHERE id = 'b21b1fc1-7bae-446f-8e88-57d7a706ab87';  -- CRV Installatietechniek (was 503920)
UPDATE klanten SET debiteurennummer = '504191' WHERE id = 'dce73027-354e-4a80-bf87-c23412788176';  -- CS Nails & Fashion (was 503659)
UPDATE klanten SET debiteurennummer = '20190387' WHERE id = '5a2d34cc-c6a5-4a6d-ac24-e3cd381b12f5';  -- Cultureel Centrum de Drommedaris (was 50479)
UPDATE klanten SET debiteurennummer = '503736' WHERE id = 'b23cf1f9-20d6-4d63-9a95-76e0ed1c4783';  -- Dakster dak & gevel techniek (was 504069)
UPDATE klanten SET debiteurennummer = '504286' WHERE id = '4989e926-c185-4c2b-8ef1-12403552ae79';  -- DamVent Benelux B.V. (was 503569)
UPDATE klanten SET debiteurennummer = '504124' WHERE id = 'db3bd4cd-7ae7-47c2-ba9a-3b7cf2e603ba';  -- Danny''s Tegelservice (was 503721)
UPDATE klanten SET debiteurennummer = '2150221' WHERE id = 'ac2cec57-5fe5-4057-a5e1-f604b295e3e8';  -- Dans en theaterschool De Cast (was 50398)
UPDATE klanten SET debiteurennummer = '503945' WHERE id = '26a59685-76b8-493c-b4b0-3232a6d77c85';  -- De 3D bar (was 503886)
UPDATE klanten SET debiteurennummer = '503830' WHERE id = 'f456e033-d650-4926-9bc9-80ca9f175123';  -- De 80 Seafood & Wine (was 503979)
UPDATE klanten SET debiteurennummer = '503458' WHERE id = '428c8936-0ff4-4d24-9e28-8e1de4d0691a';  -- De Best for Dogs & horses (was 504328)
UPDATE klanten SET debiteurennummer = '503701' WHERE id = 'eeaf627d-e87e-4f19-a3b7-659dadb91308';  -- De Boemerang (was 504104)
UPDATE klanten SET debiteurennummer = '503954' WHERE id = '036d452b-36a5-4d06-b4f6-30a98503b86c';  -- De Boer Speciaal Transport (was 503878)
UPDATE klanten SET debiteurennummer = '503672' WHERE id = 'd87bc4b2-c34e-492d-804b-e94fcca6dce6';  -- De Brasserie (was 504131)
UPDATE klanten SET debiteurennummer = '503621' WHERE id = '2645f396-4b4e-445d-84bc-8c89aef9e0f9';  -- De Dreu (was 504178)
UPDATE klanten SET debiteurennummer = '20190614' WHERE id = 'accf9c3c-690b-4b41-b9c9-eb7f89ee3e7b';  -- De Enkhuizer Notenkraam (was 503890)
UPDATE klanten SET debiteurennummer = '504267' WHERE id = '6643c08d-961e-4c44-9e2b-4cc54e0d7e5c';  -- De fruitwinkel Enkhuizen (was 503586)
UPDATE klanten SET debiteurennummer = '504211' WHERE id = '59933cf4-916d-4baf-9bcf-825717e6b95a';  -- De Gouwe Stek (was 503640)
UPDATE klanten SET debiteurennummer = '503506' WHERE id = '402e607c-80be-48c6-b70c-734fcc2b0ff5';  -- De Groot Jachtschilders (was 504285)
UPDATE klanten SET debiteurennummer = '504248' WHERE id = '6888de92-ce93-4809-b481-ded7900818c7';  -- De Jong Motor (was 503603)
UPDATE klanten SET debiteurennummer = '504337' WHERE id = 'e03ce4c9-4df7-42b6-ac0f-8dcd76011f84';  -- De Occasion Fabriek B.V. (was 503524)
UPDATE klanten SET debiteurennummer = '20190436' WHERE id = 'a7d15993-3249-45e7-934c-40b0d094c5ca';  -- De Rotterdam B.V. (was 50931)
UPDATE klanten SET debiteurennummer = '503510' WHERE id = '41ffabda-d02c-4ed2-b5af-33bfa0600b05';  -- De Schout Installatietechniek (was 504281)
UPDATE klanten SET debiteurennummer = '503846' WHERE id = '5092e1b3-af66-4ecc-af76-3fa48373f3ac';  -- De Stormvogel (was 503963)
UPDATE klanten SET debiteurennummer = '504231' WHERE id = '50d6a983-76da-481d-9064-2f15279fa314';  -- De Swaen Sloepen (was 503620)
UPDATE klanten SET debiteurennummer = '503449' WHERE id = '3a1e2560-be79-46db-bfd6-99b155951637';  -- De Taanketel (was 504335)
UPDATE klanten SET debiteurennummer = '503549' WHERE id = 'e6902887-82b4-49d2-8a66-927eb5ec77aa';  -- De Vakaturemarkt (was 504245)
UPDATE klanten SET debiteurennummer = '504377' WHERE id = '92212f51-afb1-49e4-953a-847a6699bc8a';  -- de Veiling (was 503486)
UPDATE klanten SET debiteurennummer = '503570' WHERE id = 'cfc409c4-b951-4b31-9ae4-59b74923f5fc';  -- De Vesting Makelaars (was 504225)
UPDATE klanten SET debiteurennummer = '504257' WHERE id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b';  -- De Wit Schouten B.V. (was 503595)
UPDATE klanten SET debiteurennummer = '503610' WHERE id = 'e591b5e4-4ed3-43a3-8e82-9fadd58a43dd';  -- De Woonschakel (was 504189)
UPDATE klanten SET debiteurennummer = '503548' WHERE id = '48e968fa-c88a-4ab7-bbc6-71521ed422e2';  -- DeCork (was 504246)
UPDATE klanten SET debiteurennummer = '504349' WHERE id = '07222a1d-f1d4-4fba-a639-79171db3fe9f';  -- DeJongCeba B.V. (was 503512)
UPDATE klanten SET debiteurennummer = '504011' WHERE id = '40b85439-595c-458e-b533-88723e3839ea';  -- Dekker Autogroep (was 503825)
UPDATE klanten SET debiteurennummer = '503816' WHERE id = '17d7cc97-aa71-4461-ba64-f83441038c02';  -- Dekker Tweewielers B.V. (was 503992)
UPDATE klanten SET debiteurennummer = '503867' WHERE id = '9c119b0c-e27a-47a4-bb1d-ad473f8f21fa';  -- Den Uijl Schadeservice (was 20224)
UPDATE klanten SET debiteurennummer = '503732' WHERE id = '9a2e9741-7dc8-44c7-a7ae-062ca2955a63';  -- Designista (was 504073)
UPDATE klanten SET debiteurennummer = '503907' WHERE id = '2648546b-7ab2-4365-8aa9-5da6c005bfdb';  -- Dex Transport (was 503916)
UPDATE klanten SET debiteurennummer = '504255' WHERE id = '7423c3c6-5f50-48db-8e51-a80994c009ec';  -- DH Mobility B.V. (was 503597)
UPDATE klanten SET debiteurennummer = '504134' WHERE id = '68671afc-98fd-4210-9847-b1d199cf395c';  -- Different Hotels NV (was 503712)
UPDATE klanten SET debiteurennummer = '503670' WHERE id = 'c5bf7d19-9ec1-487f-91cc-70616f2ea507';  -- Dijkman Technische werken (was 504132)
UPDATE klanten SET debiteurennummer = '504045' WHERE id = 'e8567239-9582-4a32-9ef5-9c45a88fa805';  -- DKG Services (was 503796)
UPDATE klanten SET debiteurennummer = '504009' WHERE id = 'cdc64cd6-472b-44b8-9d28-28abd81592fe';  -- Dockhouse Trading B.V. (was 503827)
UPDATE klanten SET debiteurennummer = '504234' WHERE id = '9782b7e3-9478-4036-aebc-8cac1bb325c5';  -- Dogguo B.V. (was 503617)
UPDATE klanten SET debiteurennummer = '503761' WHERE id = 'ed758882-593b-49fd-9c4e-e2e857ae6853';  -- DonkerGroen (was 504045)
UPDATE klanten SET debiteurennummer = '504372' WHERE id = 'eb88cfb8-b1e9-4462-8d49-a05a63ef1c51';  -- Dormio Water Resort Medemblik (was 503491)
UPDATE klanten SET debiteurennummer = '504283' WHERE id = 'ce10da7a-d8fd-4ad0-8bff-cd06cf22ac1f';  -- Dr. Mol Drinks B.V. (was 503572)
UPDATE klanten SET debiteurennummer = '503561' WHERE id = 'e8b4ed8b-16f5-4d8e-a9bf-6502bbace780';  -- Draka Polymer Films B.V. (was 504233)
UPDATE klanten SET debiteurennummer = '503845' WHERE id = '01dee018-7d02-47b7-bd13-21d29456775b';  -- Droom Hoeve (was 503964)
UPDATE klanten SET debiteurennummer = '503457' WHERE id = '1ee8e05f-51c0-4d5e-95f6-af36c19d731b';  -- Dubbel en Dwars (was 504329)
UPDATE klanten SET debiteurennummer = '503579' WHERE id = '7e293428-0b69-4242-80a4-f048a8fda09e';  -- Duke Travel (was 504218)
UPDATE klanten SET debiteurennummer = '504104' WHERE id = 'c621c359-4432-4483-91ac-97bd4e6f4a8e';  -- East West seeds (was 503741)
UPDATE klanten SET debiteurennummer = '50362' WHERE id = '24c2df98-1905-4b05-87b0-d251531e45ce';  -- Eb en Vloed (was 504342)
UPDATE klanten SET debiteurennummer = '504353' WHERE id = '58d5ce1c-ad5e-4cbf-a798-22d9af4ef93e';  -- EBS European Building Supply B.V. (was 503508)
UPDATE klanten SET debiteurennummer = '503975' WHERE id = 'c95a97d7-a76c-4f3e-944c-220781c71322';  -- Eetcafé de Buren (was 503859)
UPDATE klanten SET debiteurennummer = '503738' WHERE id = '6a461659-e14a-4c1a-a1fd-b6083afb7558';  -- Emago Beheer (was 504067)
UPDATE klanten SET debiteurennummer = '504295' WHERE id = 'f922d4d8-a873-4c00-add1-36cfdd528b08';  -- Energy4you (was 503560)
UPDATE klanten SET debiteurennummer = '503484' WHERE id = '85cd437a-9c0d-46e0-a53d-26c0e1653c8b';  -- Enkhuizen Slijpinrichting (was 504305)
UPDATE klanten SET debiteurennummer = '503869' WHERE id = 'dc112b49-f163-465e-b7eb-7d6424cf3bfa';  -- Enkhuizer Camperbouw (was 503535)
UPDATE klanten SET debiteurennummer = '503513' WHERE id = '6ff684af-7816-44e5-850a-25941e69136d';  -- Enkhuizer Sport Centrum (was 504278)
UPDATE klanten SET debiteurennummer = '503566' WHERE id = '84d9a480-c26d-49df-a6f7-8c4a004491d9';  -- EPS Design (was 504228)
UPDATE klanten SET debiteurennummer = '504192' WHERE id = 'b26ede11-3040-4d63-b0c6-d3d3d17e9961';  -- Ergotherapie Hoorn (was 503658)
UPDATE klanten SET debiteurennummer = '503970' WHERE id = '2792ef28-f9a5-454e-b45e-7d4b755cae97';  -- Erik''s Tweewielers (was 503864)
UPDATE klanten SET debiteurennummer = '504188' WHERE id = 'b4e32d68-f3f0-4901-9484-36c971507f2b';  -- Eternal Shine (was 503662)
UPDATE klanten SET debiteurennummer = '503877' WHERE id = '35e9a78b-65fa-47df-974f-f70afa3ec213';  -- Euro Druk Offset B.V. (was 503940)
UPDATE klanten SET debiteurennummer = '504213' WHERE id = 'b3ad2a03-3e34-47b6-a0dc-950a483ee8da';  -- Exclusive by Lynn hair & beauty concept (was 503638)
UPDATE klanten SET debiteurennummer = '503733' WHERE id = '59f5a562-7a5e-4326-8124-090886b9338d';  -- Expositieruimte de Mantel (was 504072)
UPDATE klanten SET debiteurennummer = '503527' WHERE id = '45b08d3e-a629-40c7-b2ae-10af6d863302';  -- Eyeton (was 504265)
UPDATE klanten SET debiteurennummer = '503455' WHERE id = '5efc9ccf-055d-4208-a06b-b610d88e01b7';  -- F. Smith onderhoudswerken (was 504331)
UPDATE klanten SET debiteurennummer = '503315' WHERE id = '82b0749b-d6b9-4ced-bde5-a8792a60cc41';  -- F.J. Krooymans (was 50513)
UPDATE klanten SET debiteurennummer = '504099' WHERE id = '263630b3-8cbc-43e3-8675-c9c037f4a72e';  -- Fa autoschadeherstel Grootebroek (was 503745)
UPDATE klanten SET debiteurennummer = '504228' WHERE id = 'b6a456c5-e583-4609-8bf9-01ac396866d2';  -- Fam. Schuijt (was 503623)
UPDATE klanten SET debiteurennummer = '504052' WHERE id = '6f591f09-4f47-4c7e-8032-0e8ed18f9041';  -- Feel Fit Be Balanced (was 503789)
UPDATE klanten SET debiteurennummer = '503504' WHERE id = 'd16b769a-3b6d-4383-ba1b-04439ed390bd';  -- FeestBazaar (was 504287)
UPDATE klanten SET debiteurennummer = '504031' WHERE id = '6f88b3fc-a69d-424f-975d-bb3477529170';  -- Fiesta And Friends entertainment (was 503809)
UPDATE klanten SET debiteurennummer = '503905' WHERE id = '021381cb-9e7e-4011-80cc-e9d78f7e568c';  -- Fit4lady Grootebroek (was 503918)
UPDATE klanten SET debiteurennummer = '503489' WHERE id = '10cf42bb-37ea-413f-8018-e86dd60e0f1e';  -- Flamingo Casino Alkmaar (was 504300)
UPDATE klanten SET debiteurennummer = '503553' WHERE id = '5cf78f79-e9dc-466e-9122-b4bebb64e957';  -- Flamingo Casino Bergen (was 504241)
UPDATE klanten SET debiteurennummer = '503522' WHERE id = 'affd17ad-0143-447b-b9c8-37a1ec8a9f5d';  -- Flamingo Casino Den Helder (was 504270)
UPDATE klanten SET debiteurennummer = '503523' WHERE id = 'd9430a59-5bcc-4e9b-9d2f-f4921a023195';  -- Flamingo Casino Egmond (was 504269)
UPDATE klanten SET debiteurennummer = '2150249' WHERE id = 'e4f4363b-2cca-4c6a-b955-7291701498c0';  -- Flamingo Casino Hoorn (was 22521)
UPDATE klanten SET debiteurennummer = '503555' WHERE id = '46834d28-7623-4f3c-bfd9-402a31599b22';  -- Flamingo Casino IJmuiden (was 504239)
UPDATE klanten SET debiteurennummer = '503477' WHERE id = 'e3f1a802-3bb5-4ba4-9b7c-d0b87ab8ae8d';  -- Flamingo Casino Noordwijkerhout (was 504312)
UPDATE klanten SET debiteurennummer = '50921' WHERE id = 'c93316b4-85c8-4114-86bf-77e8af70253d';  -- Flessenscheepjesmuseum (was 503985)
UPDATE klanten SET debiteurennummer = '504040' WHERE id = '8339b8e4-36cf-4bff-bb55-15bcc75c3d58';  -- Flower Valley B.V. (was 503801)
UPDATE klanten SET debiteurennummer = '503729' WHERE id = '8f3e7c81-cb8b-49e6-93b1-769a7d51cdd3';  -- Fotoster by Esther (was 504076)
UPDATE klanten SET debiteurennummer = '503500' WHERE id = '976722f4-46f0-4965-991d-f2979833a801';  -- Frank Dudink Bouwonderneming (was 504291)
UPDATE klanten SET debiteurennummer = '50206' WHERE id = 'b98549f6-b8a3-4a2a-ad08-9ee25b901cef';  -- Frank Lieve (was 50039)
UPDATE klanten SET debiteurennummer = '503633' WHERE id = 'ae339537-1aee-47fd-8f9e-1ea691eba424';  -- FS Badkamers en renovatie (was 504167)
UPDATE klanten SET debiteurennummer = '503585' WHERE id = '4cc7425a-8d62-450c-9cfd-98beb793b0ad';  -- Funk Food (was 504212)
UPDATE klanten SET debiteurennummer = '2140308' WHERE id = '272ecbe2-f698-4452-9dde-ecb07495684d';  -- Funky hair (was 503956)
UPDATE klanten SET debiteurennummer = '504081' WHERE id = 'd53a87bc-0690-4d8a-9c32-6425a1f37226';  -- Funmaxx Sailing (was 503763)
UPDATE klanten SET debiteurennummer = '503935' WHERE id = '33b971e8-e087-4478-b7ac-768fb2ecdde3';  -- Gabes (was 503895)
UPDATE klanten SET debiteurennummer = '503569' WHERE id = 'bc8b3e33-d378-4401-bb66-fe08c9385ccb';  -- Gaia BV (was 504226)
UPDATE klanten SET debiteurennummer = '50764' WHERE id = '1cacc7f0-077f-4428-ac76-88d955ff8fc1';  -- Gam Bakker (was 40276)
UPDATE klanten SET debiteurennummer = '503891' WHERE id = 'cb090eee-b58e-4ff6-8778-b9eea26ab5aa';  -- Gastouderopvang ''t Woezeltje (was 503928)
UPDATE klanten SET debiteurennummer = '504017' WHERE id = '32730a86-a26a-4e42-b135-e0b6f254a423';  -- Geboortezorg om de Noord (was 503820)
UPDATE klanten SET debiteurennummer = '503653' WHERE id = '22685023-de0c-4404-8770-e7acf34270ee';  -- Gebr. de Jong Teelt b.v. (was 504149)
UPDATE klanten SET debiteurennummer = '503485' WHERE id = '0d7a9971-ca6c-4802-a06f-ba30c46cb4b6';  -- Gebr. Kok Installatietechniek (was 504304)
UPDATE klanten SET debiteurennummer = '504039' WHERE id = '7118397d-2b1a-4495-8be2-a8a2d5fc778b';  -- Gemeente Hoorn (was 503802)
UPDATE klanten SET debiteurennummer = '22559' WHERE id = 'f4b1c67f-df27-42f1-b307-8d8e19d98f29';  -- Gemeente Stede Broec (was 503757)
UPDATE klanten SET debiteurennummer = '503756' WHERE id = '9c70a685-2fd1-4396-9753-bb14597961e9';  -- Genserik beheer (was 504050)
UPDATE klanten SET debiteurennummer = '503888' WHERE id = 'db162bb0-1bb3-416b-a394-7e1402bddcb1';  -- Gero Fishing Hengelsport (was 503931)
UPDATE klanten SET debiteurennummer = '503608' WHERE id = 'b6ea4ff2-0580-49b6-ba43-bba16db6a49d';  -- GGD Hollands Noorden (was 504191)
UPDATE klanten SET debiteurennummer = '504246' WHERE id = 'a0678853-546b-4497-a01b-9e064355494e';  -- Girls & Boys Kidfashion (was 503605)
UPDATE klanten SET debiteurennummer = '503982' WHERE id = '31816b59-c936-4bba-84ae-83e91b5b67ca';  -- Godijn Publishing (was 503853)
UPDATE klanten SET debiteurennummer = '503906' WHERE id = '8eb87b5e-9e1d-45fb-abd5-28918aae05f3';  -- Gourmet Ingredients B.V. (was 503917)
UPDATE klanten SET debiteurennummer = '504058' WHERE id = '111e015b-3bb6-49ec-9eae-e3274abb625d';  -- Grenko (was 503783)
UPDATE klanten SET debiteurennummer = '503492' WHERE id = '4d64eb0d-d9d1-417a-a42c-5eabb6bfbd50';  -- Grent Gevelonderhoud (was 504298)
UPDATE klanten SET debiteurennummer = '503638' WHERE id = '5b74a851-60ab-40cf-957e-18ea5b6d3376';  -- Groei en Bloei (was 504162)
UPDATE klanten SET debiteurennummer = '504313' WHERE id = 'daaab841-9e35-4f4b-9e31-e329daa6dbdd';  -- Groen Dakwerken (was 503542)
UPDATE klanten SET debiteurennummer = '503879' WHERE id = '9d743de4-a184-4516-8d6d-549f40ad32d3';  -- Groot&Groot  Peonies (was 503939)
UPDATE klanten SET debiteurennummer = '503519' WHERE id = '75673d8b-f630-4f42-8d13-4cbc2d4ca5a1';  -- Grundy/Endemol Nederland VOF (was 504273)
UPDATE klanten SET debiteurennummer = '503984' WHERE id = '9e94e33f-d5c7-4405-84a1-ee442048be8f';  -- GS Hoveniers (was 503852)
UPDATE klanten SET debiteurennummer = '503508' WHERE id = '3fb4fcdb-87d5-489b-b51b-17fb89f0f67b';  -- Guus Pastijn M-fuel (was 504283)
UPDATE klanten SET debiteurennummer = '503922' WHERE id = 'b1c25692-995e-45b7-b0cd-ba431a619b03';  -- H.J. de Graaf Schilderwerken (was 503904)
UPDATE klanten SET debiteurennummer = '503793' WHERE id = '4b3cd76d-4ed9-4d4f-a720-fe85e9a8ec24';  -- Hans Pronk (was 504015)
UPDATE klanten SET debiteurennummer = '504053' WHERE id = 'df803851-2422-4fff-879b-657565f3a72f';  -- Happy Child (was 503788)
UPDATE klanten SET debiteurennummer = '504258' WHERE id = 'ff105c91-91eb-40bf-b87c-251ca4a06407';  -- Harder Heating & Cooling (was 503594)
UPDATE klanten SET debiteurennummer = '503936' WHERE id = '807b5942-788a-4d30-9397-d3870c325aee';  -- Hauwert Montage Service (was 503894)
UPDATE klanten SET debiteurennummer = '503832' WHERE id = '89b81d9d-9f18-47ba-9100-82c321375159';  -- HB Autoservice (was 503977)
UPDATE klanten SET debiteurennummer = '503606' WHERE id = '75bf581b-7924-4b7c-b7ee-e87cfa888401';  -- Health & Sport Instituut Schaper (was 504193)
UPDATE klanten SET debiteurennummer = '2140298' WHERE id = 'f470e91e-038f-4b0f-81c1-91d141f6d4fb';  -- Heerlijk Eten (was 50647)
UPDATE klanten SET debiteurennummer = '503996' WHERE id = 'f2d9b852-5ce4-4b70-9a84-b107f5f517b3';  -- HEID Design (was 503840)
UPDATE klanten SET debiteurennummer = '504090' WHERE id = 'b56f19c4-d407-4543-8f93-f2a9c5617768';  -- Hercules Speeltoestellen (was 503754)
UPDATE klanten SET debiteurennummer = '503802' WHERE id = '7ae264fd-77e9-430a-882d-80eead3c9e2b';  -- Hertenkamp Enkhuizen (was 504006)
UPDATE klanten SET debiteurennummer = '503781' WHERE id = '91d1bcc0-2d61-47ba-a00d-ecb1282cbfa6';  -- Het kleine cafe (was 504027)
UPDATE klanten SET debiteurennummer = '20190573' WHERE id = 'd6d597fd-bdb7-4198-8802-ac9c2169b7b5';  -- Het stripfiguur.nl (was 504133)
UPDATE klanten SET debiteurennummer = '504284' WHERE id = '6701d456-88b4-42a3-ba64-1ead22fe8448';  -- Het Vleescentrum (was 503571)
UPDATE klanten SET debiteurennummer = '2150306' WHERE id = 'ba246e76-777b-4802-b307-0deba20c2a62';  -- Het Vlielandhotel (was 50932)
UPDATE klanten SET debiteurennummer = '504304' WHERE id = '8a8a1a65-d975-4935-ab00-2e5f5b186dff';  -- HG Europe (was 503551)
UPDATE klanten SET debiteurennummer = '504245' WHERE id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf';  -- HiFi Snij-Unie (was 503606)
UPDATE klanten SET debiteurennummer = '504121' WHERE id = '64e2dfa7-a6a8-4701-937f-0c8e9aaab04f';  -- Holding Gebroeders Houter B.V. (was 503724)
UPDATE klanten SET debiteurennummer = '504139' WHERE id = '9cc3ed09-651e-429a-840c-eedb45cc5472';  -- Holland America Line N.V. (was 503707)
UPDATE klanten SET debiteurennummer = '504068' WHERE id = 'bd174576-e091-4638-adc5-ab13019448af';  -- Holland Mechanics B.V. (was 503774)
UPDATE klanten SET debiteurennummer = '503746' WHERE id = 'b9aa6388-d199-4b2b-8593-ae9f748fa8be';  -- Honden resort Enkhuizen (was 504060)
UPDATE klanten SET debiteurennummer = '503765' WHERE id = '69d72dbe-76e7-4cc4-bb8b-7f7716e88282';  -- Hondenhotel Vlieland (was 504041)
UPDATE klanten SET debiteurennummer = '20190575' WHERE id = 'efa4e2a1-84c6-4194-aa9d-0749904444e0';  -- Hondenuitlaatservice Wolf (was 50994)
UPDATE klanten SET debiteurennummer = '503720' WHERE id = 'eb5e4b4f-4e2f-4e96-9b49-941fc8a7e8a1';  -- Honex (was 504085)
UPDATE klanten SET debiteurennummer = '503525' WHERE id = '9d52c5fc-36b4-4cdf-947a-f6fbe2c6f6bd';  -- Horizon College (was 504267)
UPDATE klanten SET debiteurennummer = '503881' WHERE id = 'f166a202-a4d7-404b-847c-59ae734d21d3';  -- Horlogerie Raymond van Dijen (was 503938)
UPDATE klanten SET debiteurennummer = '503727' WHERE id = '45d017b8-d6b7-42fb-a956-973c4b634bda';  -- Hotel appartementen Vlierijck (was 504078)
UPDATE klanten SET debiteurennummer = '20190606' WHERE id = 'e5c46163-1a37-4de6-b602-922d976750ce';  -- Hotel het Wapen van Enkhuizen (was 504077)
UPDATE klanten SET debiteurennummer = '503767' WHERE id = '27d0e2f6-3d30-4e7b-8267-02eb5112a1b3';  -- Hotel NAP (was 504039)
UPDATE klanten SET debiteurennummer = '503875' WHERE id = '1ca7807a-5c7b-48b5-a2ab-4b6367ff7de5';  -- Hotel New York B.V. (was 503942)
UPDATE klanten SET debiteurennummer = '503550' WHERE id = '02a108fa-b0b1-4736-a95d-131c4fec8091';  -- Hotel Sint Nicolaas (was 504244)
UPDATE klanten SET debiteurennummer = '504010' WHERE id = '533a0cfc-a425-46d6-885f-26a0e603fb5a';  -- Hotel Snouck van Loosen (was 503826)
UPDATE klanten SET debiteurennummer = '2150320' WHERE id = '04e1fbca-9e0c-4fdb-8b9e-032aa42fc29e';  -- Hotel van der Valk Sneek (was 503475)
UPDATE klanten SET debiteurennummer = '20190467' WHERE id = '68bcb3b8-cf08-4d04-8a98-8e83fe24f2a7';  -- Hotelletje de Veerman (was 51030)
UPDATE klanten SET debiteurennummer = '50815' WHERE id = '38460c51-ee1c-48b0-8858-dec71927ef00';  -- Hout & Meubeldesign (was 50818)
UPDATE klanten SET debiteurennummer = '503628' WHERE id = '55d60d49-0094-4c6d-9168-783cc8ec3966';  -- Huidtherapieparktijk HuidOp1 (was 504171)
UPDATE klanten SET debiteurennummer = '20190578' WHERE id = 'cb252fc0-e165-4cb3-a1bc-616617d1e159';  -- Huisartsenpraktijk Haan & Andrea (was 22918)
UPDATE klanten SET debiteurennummer = '504206' WHERE id = '764a4594-0000-411c-9995-debaaa7b157b';  -- Huisman Bouwadvies B.V. (was 503644)
UPDATE klanten SET debiteurennummer = '504300' WHERE id = 'e18c98cd-e1cf-433f-8e18-391230f98ee3';  -- Husaren B.V. (was 503555)
UPDATE klanten SET debiteurennummer = '504355' WHERE id = '63a912ea-a0a2-4ff8-b537-f8ec23f1950f';  -- HV Hoorn (was 503507)
UPDATE klanten SET debiteurennummer = '503291' WHERE id = 'f89448f4-fcc6-42a8-98e2-ed68a533343c';  -- I-Weight (was 50752)
UPDATE klanten SET debiteurennummer = '504172' WHERE id = 'ad725d7f-8ae5-4542-b0a7-c0fb8aa8437a';  -- IHUB  Zorg BV (was 503678)
UPDATE klanten SET debiteurennummer = '503820' WHERE id = '2d77d771-c6b4-452a-a0c5-0ba4d338637a';  -- IJskoninginnen (was 503988)
UPDATE klanten SET debiteurennummer = '504067' WHERE id = '7f8d5730-a8dc-48be-b691-ce5c44f6574d';  -- illuminate beauty (was 503775)
UPDATE klanten SET debiteurennummer = '504302' WHERE id = 'a7f116f2-6cec-43fc-8fab-4c775c9e12d6';  -- INDRUIPEN (was 503553)
UPDATE klanten SET debiteurennummer = '20190403' WHERE id = '18b5044e-fef7-4555-b1f5-66a592a3be2b';  -- Inloophuis de baanbreker (was 50648)
UPDATE klanten SET debiteurennummer = '504084' WHERE id = '29460779-a20c-4ef4-bbdf-deb8c6455fc7';  -- Installatiebedrijf de Streek (was 503760)
UPDATE klanten SET debiteurennummer = '503840' WHERE id = '655fbb1e-47c7-4dd8-a7f4-5106d67feaed';  -- Intervastgoed (was 503969)
UPDATE klanten SET debiteurennummer = '504293' WHERE id = '5870a568-cb1c-45a8-b6bc-62a47d410443';  -- InWrap (was 503562)
UPDATE klanten SET debiteurennummer = '504325' WHERE id = 'caee102e-6640-48e2-a512-bb62de6df477';  -- J Wiersma Schilderwerken (was 503530)
UPDATE klanten SET debiteurennummer = '503961' WHERE id = 'b497901e-55b8-4cf7-a216-41d388e8f53a';  -- Jaatinen B.V. (was 503873)
UPDATE klanten SET debiteurennummer = '503842' WHERE id = '65514526-9e7e-49ea-ad34-8e234c20eb60';  -- Jabe Reclame (was 503967)
UPDATE klanten SET debiteurennummer = '503852' WHERE id = 'eb9a84ee-a51b-439d-aa97-5d866ce2cbce';  -- Jachtservice de Werf (was 503907)
UPDATE klanten SET debiteurennummer = '503644' WHERE id = 'ba0556f3-ad4c-4c39-a64a-2d812792e27c';  -- JachtServiceEnkhuizen (was 504156)
UPDATE klanten SET debiteurennummer = '50213' WHERE id = 'a20da275-a491-4cf1-b6be-7285d3ae2cba';  -- Jan van Vlieland Fietsenverhuur (was 23904)
UPDATE klanten SET debiteurennummer = '504007' WHERE id = '2d1bddeb-1827-4b1c-ae07-87e6ab4ef3de';  -- Jan Zandbergen World-Wide Quality in Meat (was 503829)
UPDATE klanten SET debiteurennummer = '504308' WHERE id = 'e9bce61a-a66f-4ac8-94bc-6e6b3449962d';  -- Jansen Paprika Veenakkers (was 503547)
UPDATE klanten SET debiteurennummer = '504357' WHERE id = 'b4b797ab-e5f6-48d2-b7ec-1133027adf6c';  -- Janssen (was 503505)
UPDATE klanten SET debiteurennummer = '503950' WHERE id = '8d0e04e8-2d9c-43a4-890b-4d6f4174c567';  -- JB in vorm (was 503882)
UPDATE klanten SET debiteurennummer = '504146' WHERE id = '9d62f307-4efa-4741-8cba-662e7900fd21';  -- JDB Solar (was 503701)
UPDATE klanten SET debiteurennummer = '503937' WHERE id = '91b7f767-243e-4239-a07e-e4f2a6024358';  -- Jeno Wood (was 503893)
UPDATE klanten SET debiteurennummer = '503997' WHERE id = '48443a6b-9fbf-4736-bb08-5fb5a7361381';  -- Jesse Drent (was 503839)
UPDATE klanten SET debiteurennummer = '503883' WHERE id = '0ff82308-9d46-4781-90fa-0949aebab201';  -- JJ royal car service (was 503936)
UPDATE klanten SET debiteurennummer = '504109' WHERE id = '8799ae44-3f06-4bef-9811-f770c0dbfb23';  -- Jord de Boer Osteopathie (was 503736)
UPDATE klanten SET debiteurennummer = '503526' WHERE id = '8ec4a84b-3e96-4580-ba0a-108a68338f6f';  -- Jouw Marktkraam Stedebroec (was 504266)
UPDATE klanten SET debiteurennummer = '504018' WHERE id = 'b34c94b9-c3cd-45ce-8096-5c3582ffbd07';  -- Jouw Stijl (was 503819)
UPDATE klanten SET debiteurennummer = '504203' WHERE id = '608d1dde-4c30-4c37-a6c0-a2dce0b1d500';  -- JR. Bedrijfswagens (was 503647)
UPDATE klanten SET debiteurennummer = '504149' WHERE id = '9dcc541b-d96b-4b20-9ff2-12fbd90d00ac';  -- JS Entertainment (was 503698)
UPDATE klanten SET debiteurennummer = '504197' WHERE id = '3c4ed447-c14c-46b4-8542-08baa5607529';  -- Juwelier Westra-Hinke (was 503653)
UPDATE klanten SET debiteurennummer = '503962' WHERE id = '1065ffcf-c377-49a5-9353-ac5b051a1b4b';  -- K.B.K. Vastgoedonderhoud (was 503872)
UPDATE klanten SET debiteurennummer = '503985' WHERE id = '18ab9126-3e06-42f2-91fa-3bde6e056364';  -- Kaijer Busvervoer (was 503851)
UPDATE klanten SET debiteurennummer = '504163' WHERE id = 'dfe3ccd5-fba8-4e4b-9676-12faadc152fd';  -- Kapsalon Nicole (was 503687)
UPDATE klanten SET debiteurennummer = '504006' WHERE id = '3cf35d1d-101d-4bde-9937-09278e9dbf0f';  -- Katholieke basisschool de Hoeksteen (was 503830)
UPDATE klanten SET debiteurennummer = '503876' WHERE id = '84424318-f88f-473c-90e8-9b9547c124c4';  -- Keesman Slotenmaker (was 503941)
UPDATE klanten SET debiteurennummer = '504376' WHERE id = '265cdba4-c9fc-4f45-864c-3501308941b5';  -- Keim Nederland B.V. (was 503487)
UPDATE klanten SET debiteurennummer = '503613' WHERE id = '7757744b-a0ee-4801-be45-f4b02fad0cc8';  -- Kersten B.V. (was 504186)
UPDATE klanten SET debiteurennummer = '503797' WHERE id = 'e31e3459-1974-4e6d-a08f-242fe4be0871';  -- Keurslagerij Robin Tuijp (was 504011)
UPDATE klanten SET debiteurennummer = '20190574' WHERE id = 'fbbfc358-3d6e-4cc2-81f4-dc33d23a2670';  -- Kilomarkt (was 504238)
UPDATE klanten SET debiteurennummer = '504025' WHERE id = 'c230798d-e9b4-4a33-8302-e6d07ae181c5';  -- Kim Franx (was 503814)
UPDATE klanten SET debiteurennummer = '504151' WHERE id = '055d0739-ef5b-47d4-800f-96342d24bcee';  -- Kimberley Pellekaan Design (was 503697)
UPDATE klanten SET debiteurennummer = '504105' WHERE id = '9f4081ba-8098-4525-b719-2a9fbcb86c08';  -- King And Queen Body Art B.V. (was 503740)
UPDATE klanten SET debiteurennummer = '503244' WHERE id = 'f60f334e-210e-4cdf-bc63-087dcdfcd504';  -- Klaas en Zo (was 50763)
UPDATE klanten SET debiteurennummer = '504178' WHERE id = 'b9e8e98c-e7d0-440a-901a-3c64a37bc4a0';  -- Klerk Yacht Service B.V. (was 503672)
UPDATE klanten SET debiteurennummer = '503290' WHERE id = 'aa0d8f98-096a-459d-bfb6-dea1317a944c';  -- Klus-Student.nl (was 50700)
UPDATE klanten SET debiteurennummer = '504343' WHERE id = '7e29e1df-fbd5-48ea-8268-066d5c7df1b6';  -- Known-YOU Seed Co. LTD (was 503518)
UPDATE klanten SET debiteurennummer = '504339' WHERE id = '41b887e7-aed3-471a-adf0-c1cc6d04d3e0';  -- Known-You Seed Europe B.V. (was 503522)
UPDATE klanten SET debiteurennummer = '503831' WHERE id = '2f569126-9b5d-45d9-a684-9c64359a9808';  -- KNRM Enkhuizen (was 503978)
UPDATE klanten SET debiteurennummer = '504170' WHERE id = '1fd67701-5282-41ef-a8a5-3e0622ec9a9e';  -- KNRM Medemblik (was 503680)
UPDATE klanten SET debiteurennummer = '503801' WHERE id = 'bd559eeb-e82e-4fa2-b3c2-07172208a205';  -- Komeet Vastgoed (was 504007)
UPDATE klanten SET debiteurennummer = '504309' WHERE id = 'b54f9d50-6cd1-4aae-8f0a-ea1335debdf6';  -- Koninklijke nederlandse Zeil en Roeivereeninging (was 503546)
UPDATE klanten SET debiteurennummer = '503956' WHERE id = '74bbbf14-5f57-4f60-9738-7bd66cea5299';  -- Koster Zeilmakerij (was 503876)
UPDATE klanten SET debiteurennummer = '20190595' WHERE id = '860d3722-867c-4e17-8bf7-330c835bf29e';  -- Kredon B.V. (was 503855)
UPDATE klanten SET debiteurennummer = '504232' WHERE id = '30f3f79d-c799-4bd7-a029-9dbea8a6af11';  -- Kroonvaarders KNSM (was 503619)
UPDATE klanten SET debiteurennummer = '504114' WHERE id = '50de6896-0c99-4053-a90a-faf68f69b007';  -- Kwetternest (was 503731)
UPDATE klanten SET debiteurennummer = '503871' WHERE id = '0e83dc3a-a98d-4fac-a1ca-5f54aee3597e';  -- Kwinta (was 503946)
UPDATE klanten SET debiteurennummer = '504044' WHERE id = 'e09e4df7-3106-45a7-bd3b-275d0b038b4b';  -- La Kingma (was 503797)
UPDATE klanten SET debiteurennummer = '503999' WHERE id = 'd10ae6e6-a6b3-4401-a0e9-351f0cc7c281';  -- Label Noord (was 503837)
UPDATE klanten SET debiteurennummer = '503505' WHERE id = '3e7e2b28-20b9-4d7a-82e1-ea61b5f55f30';  -- Leba Metaalbewerking (was 504286)
UPDATE klanten SET debiteurennummer = '503687' WHERE id = '7b18124d-f4eb-456f-86e2-d593660a16cb';  -- Ledschermbus.nl (was 504116)
UPDATE klanten SET debiteurennummer = '503919' WHERE id = '48bc853e-d6ea-4a83-b393-0ae24d60ede8';  -- Lorelei''s Pluktuin (was 503877)
UPDATE klanten SET debiteurennummer = '504136' WHERE id = 'c87cd23c-7d79-4720-9cc3-3ee0df04d144';  -- LT voetbalacademie (was 503710)
UPDATE klanten SET debiteurennummer = '504254' WHERE id = 'c0c096ae-6251-4df2-95e3-3faac6a7bc99';  -- Lub Timmerwerken B.V. (was 503598)
UPDATE klanten SET debiteurennummer = '2150229' WHERE id = 'e3d4edf8-ac35-45e7-8e71-a48f69b42fe1';  -- Lunchcafe de Kathedraal (was 20611)
UPDATE klanten SET debiteurennummer = '2140132' WHERE id = 'e5ed738e-0aa6-4996-a4a7-633a0ca52b04';  -- LVD Graphics (was 50194)
UPDATE klanten SET debiteurennummer = '503665' WHERE id = 'bf4736cb-332e-41d7-82c1-770aae50d5e3';  -- M. Jaski (was 504137)
UPDATE klanten SET debiteurennummer = '503664' WHERE id = '321550c4-0247-4cc9-acc8-9fb56dbb8ed1';  -- Maarten Jan Reijnders (was 504138)
UPDATE klanten SET debiteurennummer = '20190526' WHERE id = 'a14cd635-9a49-46d6-bcec-0b79d053bbd3';  -- Maatschappij WIC (was 504199)
UPDATE klanten SET debiteurennummer = '503844' WHERE id = 'c49ad38d-bdd1-43c6-8e71-206db8da1b2d';  -- Machteld Stins sportcentrum (was 503965)
UPDATE klanten SET debiteurennummer = '504032' WHERE id = 'fbb88086-65c4-429b-a845-14dfd4310908';  -- Maiq Business (was 503808)
UPDATE klanten SET debiteurennummer = '503988' WHERE id = '0390a0c8-33ed-4412-b941-f14c2acd4454';  -- Marco Schmidt (was 503848)
UPDATE klanten SET debiteurennummer = '20190582' WHERE id = 'cc3c1d98-7458-4e55-8bc0-d66625f3acd4';  -- Marijke Lingerie (was 25480)
UPDATE klanten SET debiteurennummer = '503671' WHERE id = '58a0b811-3ede-478d-a7fc-d0e830b69a3b';  -- Marked & Signed (was 504035)
UPDATE klanten SET debiteurennummer = '503630' WHERE id = '1e8ab057-cea2-4742-b865-c8b850c0a66b';  -- Marktzaken Zuidermarkt (was 504170)
UPDATE klanten SET debiteurennummer = '503748' WHERE id = 'bf6b1aa9-29a9-4f22-81d9-3b1d552eaa57';  -- Marma Vastgoed B.V. (was 504058)
UPDATE klanten SET debiteurennummer = '503686' WHERE id = '54628b5c-45f7-434a-b588-7bbd8d783460';  -- Martins Transfer Service (was 504117)
UPDATE klanten SET debiteurennummer = '503882' WHERE id = '6a361304-e336-480b-a258-c2426b1ce025';  -- Massagepraktijk Amy de Wit (was 503937)
UPDATE klanten SET debiteurennummer = '504028' WHERE id = '6bf20d93-9cbc-4820-8960-abce78fbe704';  -- Mastermate Divema (was 503811)
UPDATE klanten SET debiteurennummer = '503574' WHERE id = '35afeae7-f83f-435c-87d5-b793af47c538';  -- Mathieu van Kortenhof (was 504222)
UPDATE klanten SET debiteurennummer = '504221' WHERE id = '00d069f4-7c76-42b3-9798-d7ec8ec72139';  -- MCBS.nl (was 503630)
UPDATE klanten SET debiteurennummer = '504208' WHERE id = '94b4c909-83c1-421e-83be-2dc7e9e0551d';  -- Medipoint | Evean | Wormerveer (was 503643)
UPDATE klanten SET debiteurennummer = '503530' WHERE id = 'b7387de4-626c-4151-8986-690b3bb66745';  -- MEE & de Wering (was 504262)
UPDATE klanten SET debiteurennummer = '504071' WHERE id = '32800a44-cb3f-4f54-aa1c-1bb18a14dfe4';  -- Meer dan warmte B.V. (was 503771)
UPDATE klanten SET debiteurennummer = '503841' WHERE id = '5bd1e99c-25d6-46b2-9a1e-17228e39dcc0';  -- Meester Vastinvest BV (was 503968)
UPDATE klanten SET debiteurennummer = '504266' WHERE id = 'f41d9844-28a0-464f-9272-f10833db8a49';  -- Mimine Kitchen (was 503587)
UPDATE klanten SET debiteurennummer = '20190374' WHERE id = '65835a99-9131-45a0-93b4-78787cf620e0';  -- Mini snackbar Petertje (was 50147)
UPDATE klanten SET debiteurennummer = '504083' WHERE id = '2a1c4ede-bf09-4a05-b116-67bb9a309d67';  -- Ministerie van Defensie (was 503761)
UPDATE klanten SET debiteurennummer = '504033' WHERE id = '9c8954e0-67f0-493a-8666-f7f44ef8800d';  -- MiSento (was 503807)
UPDATE klanten SET debiteurennummer = '504345' WHERE id = '0a9c2b42-a967-462f-944c-33d60fd18373';  -- MM Hoorn Beheer B.V. (was 503516)
UPDATE klanten SET debiteurennummer = '503666' WHERE id = 'd1e40d24-fd54-40c3-9ced-a548034c100e';  -- Mondhygiënisten praktijk enkhuizen (was 504136)
UPDATE klanten SET debiteurennummer = '504027' WHERE id = '181eaa0c-7848-4ad0-bccb-9af5656718e6';  -- Montage Jan (was 503812)
UPDATE klanten SET debiteurennummer = '20190621' WHERE id = 'd8d33f2b-7276-4732-a115-b88fa16f2eb6';  -- Mooiegordijnen opmaat.nl (was 504107)
UPDATE klanten SET debiteurennummer = '504123' WHERE id = 'd0c4b24d-a8a1-4047-aa97-f07d8d1d8c3d';  -- Mr Verna (was 503722)
UPDATE klanten SET debiteurennummer = '503547' WHERE id = 'f1d03a79-1d6f-4c8e-82fd-e5f33eae7732';  -- Mymi''s Hot Dogs (was 504247)
UPDATE klanten SET debiteurennummer = '503930' WHERE id = '4d09cf36-fec7-46ef-9dfa-d5d7c4efe96a';  -- MZA (was 503898)
UPDATE klanten SET debiteurennummer = '503940' WHERE id = '97a92b07-2492-4254-93a5-3a03733ad204';  -- N.T. de Jong loodgietersbedrijf (was 503891)
UPDATE klanten SET debiteurennummer = '20190542' WHERE id = '1f7687cb-8db1-49e1-8dd7-2839bafb7dc0';  -- NAP Stukadoorsbedrijf vof (was 504181)
UPDATE klanten SET debiteurennummer = '503707' WHERE id = 'e4a2e279-8b0d-461e-8e20-f268c5c2fc6f';  -- Natuur-el (was 504098)
UPDATE klanten SET debiteurennummer = '503931' WHERE id = '6f0b3a10-6f49-4c6e-af41-c0079b710eab';  -- Nedvent VOF (was 503897)
UPDATE klanten SET debiteurennummer = '503662' WHERE id = '50d90f6e-9e07-4257-819d-c8f2b6d3cfee';  -- NEKO products BV (was 504140)
UPDATE klanten SET debiteurennummer = '503866' WHERE id = '7f418521-ed30-4a12-9723-4e9114d506dd';  -- Neon Products (was 503948)
UPDATE klanten SET debiteurennummer = '504301' WHERE id = '320bb549-9101-436a-8724-6c94b5392cd5';  -- Neutmast B.V. (was 503554)
UPDATE klanten SET debiteurennummer = '504356' WHERE id = '7dac22ae-d670-4172-af12-c851c85e3671';  -- New Circle B.V. (was 503506)
UPDATE klanten SET debiteurennummer = '504175' WHERE id = 'd53a1224-3683-42ed-8019-9696a0b6296f';  -- Newio (was 503675)
UPDATE klanten SET debiteurennummer = '503863' WHERE id = '73814fe5-3461-4df6-a6d4-9e1f948f6d78';  -- Nexus B.V. (was 503949)
UPDATE klanten SET debiteurennummer = '504292' WHERE id = '4fdd3614-3fa4-4e94-a61d-e469456036bf';  -- Ngage Recruitment B.V. (was 503563)
UPDATE klanten SET debiteurennummer = '503868' WHERE id = 'e3163626-a7d7-4d21-9cc4-8872d03875d6';  -- Nibo installatietechniek (was 503947)
UPDATE klanten SET debiteurennummer = '503838' WHERE id = 'f64d0a92-880e-4d5e-aad0-ff9e7b5752a6';  -- Nienke Bodewes (was 503971)
UPDATE klanten SET debiteurennummer = '504008' WHERE id = '74bf908b-3577-4ed8-a2ca-3328ab84b401';  -- Nimbus Drachten B.V. (was 503828)
UPDATE klanten SET debiteurennummer = '504328' WHERE id = '80f7d07d-37f7-4f5a-a5d9-6fd8b0d526fd';  -- Njoy Media B.V. (was 503528)
UPDATE klanten SET debiteurennummer = '503509' WHERE id = '4f739630-a2e8-4d20-a6ba-259eb3cbbd34';  -- Noelia Nails (was 504282)
UPDATE klanten SET debiteurennummer = '504034' WHERE id = '06a90e72-a0c5-4671-a945-a73440976740';  -- Noorderlicht (was 503806)
UPDATE klanten SET debiteurennummer = '503901' WHERE id = 'd04c1262-e550-42ab-86ae-214699316f1a';  -- Noorderling Water (was 503919)
UPDATE klanten SET debiteurennummer = '411421' WHERE id = '746bc663-a51e-48e5-8e7e-4d418237aae5';  -- Nouveau Coiffures (was 41142)
UPDATE klanten SET debiteurennummer = '503571' WHERE id = 'ba2ab57e-3ce2-4b5d-a792-f52decbc2022';  -- NSI Kantoren B.V. (was 504224)
UPDATE klanten SET debiteurennummer = '504321' WHERE id = '0bf7b3dd-b21e-4efa-9a22-abf5ec9f0ef6';  -- O''brien yacht Coaters (was 503534)
UPDATE klanten SET debiteurennummer = '503690' WHERE id = 'db42677f-f969-4082-b5d7-fc91aa1d7c8e';  -- OBS De Piramide (was 504113)
UPDATE klanten SET debiteurennummer = '504351' WHERE id = 'eb4c630e-6066-45ea-8265-6de8037fd23f';  -- OBS De vlieger (was 503510)
UPDATE klanten SET debiteurennummer = '503973' WHERE id = '92f82fb6-332b-48d8-b4ef-f962e4fe9e51';  -- OBS Het Driespan (was 503861)
UPDATE klanten SET debiteurennummer = '504281' WHERE id = 'a92decf2-e268-42f9-b1fd-67310def7f91';  -- One stop UV shop B.V. (was 503574)
UPDATE klanten SET debiteurennummer = '503661' WHERE id = '8ace47e4-4d0d-47f9-803e-7a06d9abe5db';  -- Ooms Bouw (was 504141)
UPDATE klanten SET debiteurennummer = '503872' WHERE id = '4d298ecb-2ad5-49a3-a7cc-486b1075de61';  -- Open+Kunst+Studio (was 503945)
UPDATE klanten SET debiteurennummer = '503454' WHERE id = '8ae88dc5-6d25-4f9f-8631-356845e2b21f';  -- Opscheppen met Severine (was 504332)
UPDATE klanten SET debiteurennummer = '503713' WHERE id = '925b65ca-f4fd-4b99-81fa-f1519de59940';  -- Oude Doelen beheer BV (was 504092)
UPDATE klanten SET debiteurennummer = '503810' WHERE id = '144e8d71-0e98-4347-ae0e-12f57dd10f5c';  -- Ovy Services (was 503998)
UPDATE klanten SET debiteurennummer = '503835' WHERE id = '60f2b133-f712-4fef-8bfc-842c572b484c';  -- Patisserieta (was 503974)
UPDATE klanten SET debiteurennummer = '503511' WHERE id = 'efa5887e-d14a-4066-8e72-ebfcbea1a0fa';  -- Peter Pauw Dienstverlening (was 504280)
UPDATE klanten SET debiteurennummer = '504205' WHERE id = '630e3de6-8aeb-4025-8819-1569b29da3d9';  -- PETKUS Selecta B.V. (was 503645)
UPDATE klanten SET debiteurennummer = '503785' WHERE id = '53dcf131-2e06-485b-ab06-7e3f8a008b34';  -- Petra''s haarstyling (was 504023)
UPDATE klanten SET debiteurennummer = '504253' WHERE id = '44fc3512-926b-4e89-b5ca-ec1aa84d25a0';  -- Photo & Zo (was 503599)
UPDATE klanten SET debiteurennummer = '504180' WHERE id = '51e6e199-c192-4c13-bbaf-92454e3397ca';  -- Pindabranderij.nl (was 503670)
UPDATE klanten SET debiteurennummer = '504118' WHERE id = '1a2a47fc-fca5-45a4-8b1b-fa1330bd5923';  -- Plan W (was 503727)
UPDATE klanten SET debiteurennummer = '504340' WHERE id = 'fdda46bb-3ed2-4f4d-8584-1b53f5c2366a';  -- Planeet van Betekenis (was 503521)
UPDATE klanten SET debiteurennummer = '504338' WHERE id = '7577336e-b023-4e14-a336-e5d92311f523';  -- Platax (was 503523)
UPDATE klanten SET debiteurennummer = '504277' WHERE id = 'b9ad45ff-7007-498e-a1f7-cd0c8926cd65';  -- Plonie''s patisserie (was 503577)
UPDATE klanten SET debiteurennummer = '503762' WHERE id = '8b6be129-de86-4405-b55e-babbd0bd2436';  -- Plop-up (was 504044)
UPDATE klanten SET debiteurennummer = '504233' WHERE id = '1a61c1da-36fb-4fe6-b7ac-92f06b726d91';  -- Podozorg Wervershoof, Bianca Moll (was 503618)
UPDATE klanten SET debiteurennummer = '503806' WHERE id = '202f1b30-462b-4635-934f-4e05a05964a4';  -- Politie PDC Servicedesk FM (was 504002)
UPDATE klanten SET debiteurennummer = '503925' WHERE id = 'a0bbd244-818e-41ba-9784-f646267f2ddb';  -- Postma Cascobouw (was 503901)
UPDATE klanten SET debiteurennummer = '503583' WHERE id = '8e6ee539-8eee-42b3-8d7f-d3664ed12e6f';  -- Postma Solutions (was 504214)
UPDATE klanten SET debiteurennummer = '503725' WHERE id = 'c1e8382b-a303-44d6-b3ae-72418f264200';  -- Power Beleggingen B.V. (was 504080)
UPDATE klanten SET debiteurennummer = '504080' WHERE id = '9482b75a-73d3-490f-b0e6-b0daed6c0afb';  -- PR Signing B.V. (was 503764)
UPDATE klanten SET debiteurennummer = '503768' WHERE id = '5a366331-e186-40fe-99a5-1b84e2be838d';  -- Praktijk Helen Immink (was 504038)
UPDATE klanten SET debiteurennummer = '503834' WHERE id = '7ec56351-da1d-4b64-924f-bf6a64fe55b6';  -- Prive Butler Meester - van Kampen (was 503975)
UPDATE klanten SET debiteurennummer = '503601' WHERE id = 'eb5cf722-ad11-4913-881a-381b13d9053a';  -- Probin van Zuylen (was 504198)
UPDATE klanten SET debiteurennummer = '2140553' WHERE id = '0c25bbf4-4401-4dd4-bcb0-f79b58955fc9';  -- PTR Traprenovatie (was 51007)
UPDATE klanten SET debiteurennummer = '503572' WHERE id = '0b03314c-578e-40a3-ad49-590d677399db';  -- Q2Be (was 504223)
UPDATE klanten SET debiteurennummer = '503964' WHERE id = '16ecee09-cb71-425f-a8d7-02313091d454';  -- Quirijn Bolle (was 503870)
UPDATE klanten SET debiteurennummer = '503294' WHERE id = 'f1922662-4312-4f4d-abd8-8b4abdb6b381';  -- Qusinox B.V. (was 503902)
UPDATE klanten SET debiteurennummer = '504116' WHERE id = 'e9590082-d970-4de1-a369-b1877b4581fa';  -- RC Loodgieters (was 503729)
UPDATE klanten SET debiteurennummer = '20611' WHERE id = '2790bd4c-a18d-4147-880a-f2974927bff1';  -- Real Bread Company (was 20609)
UPDATE klanten SET debiteurennummer = '504202' WHERE id = 'cee6dc54-6657-4f02-81ea-1cb602dbbdcc';  -- Rederij V & O B.V. (was 503648)
UPDATE klanten SET debiteurennummer = '504086' WHERE id = '6b50b97e-5ffc-485d-96e9-0abc3de2e183';  -- Rederij Wantij (was 503758)
UPDATE klanten SET debiteurennummer = '2140307' WHERE id = '95a20aec-7fe7-4808-a1dc-beee4bfc210a';  -- Reehorst (was 50887)
UPDATE klanten SET debiteurennummer = '504176' WHERE id = 'e9729f06-6340-4536-a81b-48fc3cc8ebbe';  -- Reggie''s Snackhouse (was 503674)
UPDATE klanten SET debiteurennummer = '2150303' WHERE id = 'ec7459dd-3cfd-4433-936f-d98a1db58757';  -- Rene Bakker Technische Montage (was 50912)
UPDATE klanten SET debiteurennummer = '503623' WHERE id = 'ef3bae30-c6fd-43b2-badc-12a31e148b14';  -- Reparatiebedrijf Kooy BV (was 504176)
UPDATE klanten SET debiteurennummer = '504362' WHERE id = '25fc4bec-3a70-49a8-93e9-de7870495ab2';  -- Restaurant BIJ N.A.P. (was 503501)
UPDATE klanten SET debiteurennummer = '504270' WHERE id = '27962fbc-e585-474a-9603-4907356cd9d7';  -- Restaurant Lotus Enkhuizen B.V. (was 503584)
UPDATE klanten SET debiteurennummer = '504368' WHERE id = '521c38cd-10af-49dc-8b34-a1fb14d62665';  -- Restaurant Mizo (was 503495)
UPDATE klanten SET debiteurennummer = '503714' WHERE id = 'a8caff6b-668e-41d2-ab24-2585dc557069';  -- Restaurant Sunny, (was 504091)
UPDATE klanten SET debiteurennummer = '504077' WHERE id = '762a218c-3865-4d2b-b96a-5db6fc1dc4dc';  -- Reudenroos (was 503766)
UPDATE klanten SET debiteurennummer = '504111' WHERE id = '705b199d-fab6-47e0-8cc2-d548cc8aa30e';  -- Ribon (was 503734)
UPDATE klanten SET debiteurennummer = '504092' WHERE id = '97ac452f-fb5f-4b29-9e61-886702e9e07e';  -- Rick Wolkers (was 503752)
UPDATE klanten SET debiteurennummer = '504342' WHERE id = '7b132253-376e-4e0d-9df4-e33881dd6379';  -- Rijschool Noest (was 503519)
UPDATE klanten SET debiteurennummer = '504062' WHERE id = 'e98ddc1e-dc7c-4bdd-95c4-a25b5c8659f9';  -- Rijschool van Heuven (was 503779)
UPDATE klanten SET debiteurennummer = '504256' WHERE id = 'f123bab5-f819-4637-b5a9-ec5b95ac6fa1';  -- RK Klussen (was 503596)
UPDATE klanten SET debiteurennummer = '503658' WHERE id = '1dddff8c-beea-4a79-8e5b-f0a6da2b8dd2';  -- Rob Boon (was 504144)
UPDATE klanten SET debiteurennummer = '503807' WHERE id = '79728601-2e6a-442f-9130-899e3f5e086e';  -- Rode Kruis Ziekenhuis (was 504001)
UPDATE klanten SET debiteurennummer = '504240' WHERE id = '7a1e3541-fb9b-472f-951f-9805a594dff5';  -- Rogema (was 503611)
UPDATE klanten SET debiteurennummer = '504269' WHERE id = '8c3c3bbb-7807-4d1b-8bc3-29fa28b4e687';  -- Ronwo montage (was 503585)
UPDATE klanten SET debiteurennummer = '503913' WHERE id = 'b166aeb5-c186-45da-aeb0-5dbe3a327241';  -- Rosenboom...Voor je kantoor (was 503910)
UPDATE klanten SET debiteurennummer = '503607' WHERE id = '631a2508-acba-4e0a-a8ad-2ef876969c77';  -- Ruiter Dienstverlening (was 504192)
UPDATE klanten SET debiteurennummer = '504225' WHERE id = '2d35d12e-b5a5-4eb3-920f-d5d101f0ad4e';  -- RVI Techniek (was 503626)
UPDATE klanten SET debiteurennummer = '504316' WHERE id = 'bb01dfc8-e213-4cae-a3b5-c74dfb516127';  -- Salon Femme (was 503539)
UPDATE klanten SET debiteurennummer = '503512' WHERE id = '8139a1bc-c2be-44d6-8dd1-2794ae59f9d8';  -- Sam Helpt! (was 504279)
UPDATE klanten SET debiteurennummer = '504014' WHERE id = 'b4a180aa-4427-4461-9001-0757f693d579';  -- Sandra''s Knipperij (was 503822)
UPDATE klanten SET debiteurennummer = '504193' WHERE id = 'bf9b2681-dab2-4dc2-aedc-27eaba17c846';  -- SB Dienstverlening (was 503657)
UPDATE klanten SET debiteurennummer = '504209' WHERE id = 'c693bd24-e9e5-4a74-b292-24080e298988';  -- Schadenberg Dakwerken BV (was 503642)
UPDATE klanten SET debiteurennummer = '503874' WHERE id = '1630e1e8-ed79-400b-bfd2-3d9dbf80d906';  -- Schadenberg Groep (was 503943)
UPDATE klanten SET debiteurennummer = '503288' WHERE id = '9d458329-adcc-44ee-b06e-a6d37c38ef16';  -- Schalkwijk Juwelier (was 50828)
UPDATE klanten SET debiteurennummer = '503537' WHERE id = '290206a4-992a-4fdf-b5a1-617b2a4c2732';  -- Scheepsbetimmering Kroon (was 504257)
UPDATE klanten SET debiteurennummer = '51043' WHERE id = '32e22542-559e-4edf-a832-2d063105345e';  -- Scheperswijk Bloemen B.V. (was 503770)
UPDATE klanten SET debiteurennummer = '504161' WHERE id = '5857d580-56cf-4649-87b1-9084e8976474';  -- Schilder Installatietechniek (was 503689)
UPDATE klanten SET debiteurennummer = '504127' WHERE id = 'f10a6431-50e5-435e-bd2a-005da5876a91';  -- Schooneman Keukens (was 503718)
UPDATE klanten SET debiteurennummer = '503851' WHERE id = '1f220569-39f9-4a6a-9c6d-e1ceac7fd3c2';  -- Searle Advocatuur (was 503959)
UPDATE klanten SET debiteurennummer = '503934' WHERE id = 'a35fd60a-0e97-49eb-8eef-47af6c354888';  -- Seen Familierecht (was 503896)
UPDATE klanten SET debiteurennummer = '504274' WHERE id = 'c907d635-e4f7-46e9-9e25-0569844abb5f';  -- Serena Cruiseline B.V. (was 503580)
UPDATE klanten SET debiteurennummer = '504242' WHERE id = '15756db3-6d54-4818-9218-b801e79d928c';  -- SES Schilders (was 503609)
UPDATE klanten SET debiteurennummer = '503486' WHERE id = '344f1ca0-58ba-4b04-aa13-c53e02a9ee1e';  -- Siem Reus (was 504303)
UPDATE klanten SET debiteurennummer = '503927' WHERE id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751';  -- Sign Company (was 503453)
UPDATE klanten SET debiteurennummer = '503639' WHERE id = '71d3057a-2a6d-439f-a2b9-36131afd9925';  -- Signnovation (was 504161)
UPDATE klanten SET debiteurennummer = '504223' WHERE id = '64d81f1e-e1be-475d-ae64-1ff4e1dac246';  -- Sigrow B.V. (was 503628)
UPDATE klanten SET debiteurennummer = '504335' WHERE id = '5cfaee79-6249-4a03-9a08-d3adbe77f624';  -- Silema Beheer B.V. (was 503526)
UPDATE klanten SET debiteurennummer = '504186' WHERE id = '487557ac-e892-428e-9cbc-7e5d373cc24e';  -- Simar BV (was 503664)
UPDATE klanten SET debiteurennummer = '503592' WHERE id = '9f199c7c-8b31-4861-8dcb-84cfe35fbd76';  -- Simonis Voogd Design bv (was 504206)
UPDATE klanten SET debiteurennummer = '503602' WHERE id = '5a2e81cc-fc1c-4067-83cd-9255c934f282';  -- SKA Projectmanagement B.V. (was 504197)
UPDATE klanten SET debiteurennummer = '503858' WHERE id = '5e9ded31-809e-42a7-b7c2-761868aee410';  -- Skinlab by Iris (was 503954)
UPDATE klanten SET debiteurennummer = '503545' WHERE id = 'cb209d19-0834-4e7c-b13b-cf6f26c2ce0d';  -- Slijterij de Dijk (was 504249)
UPDATE klanten SET debiteurennummer = '504122' WHERE id = 'ebb35aac-4d15-4cb0-b820-cd2ade8efb29';  -- Slokker Bouwgroep b.v. (was 503723)
UPDATE klanten SET debiteurennummer = '504132' WHERE id = '1e20db60-2f41-413c-8631-f81b6da37606';  -- Smaak van de Streek (was 503714)
UPDATE klanten SET debiteurennummer = '503754' WHERE id = 'ea6c13f9-e961-49b3-a354-c3182441822f';  -- Smid Schildersbedrijf (was 504052)
UPDATE klanten SET debiteurennummer = '504210' WHERE id = '506b1bd6-1c79-4756-a689-bde132ba5826';  -- Smit-Brandhoff Tweewielers B.V. (was 503641)
UPDATE klanten SET debiteurennummer = '503928' WHERE id = 'bb8f4afe-8760-419a-926d-c7fa9aedf369';  -- Sneltekst (was 503899)
UPDATE klanten SET debiteurennummer = '503994' WHERE id = 'be75a6de-46f2-4219-a73d-dd9e945118bb';  -- Soci.Bike B.V. (was 503842)
UPDATE klanten SET debiteurennummer = '503678' WHERE id = '04d008b7-4e10-4193-a97e-da5850b94328';  -- Social Blue (was 504125)
UPDATE klanten SET debiteurennummer = '503889' WHERE id = '5bd12fc8-945b-44b7-8428-cfd8637581cd';  -- Spataro (was 503930)
UPDATE klanten SET debiteurennummer = '503712' WHERE id = '9c5ea9a2-c28e-4b2e-96ac-17abd58e10ac';  -- Sportcafe de Kloet (was 504093)
UPDATE klanten SET debiteurennummer = '504334' WHERE id = 'cbff52da-40f1-4ba3-8543-253e50ef785d';  -- Sportclub Harmelen (SCH''44) (was 503527)
UPDATE klanten SET debiteurennummer = '2140551' WHERE id = '4ad0d530-f51f-4553-82a6-dbd2056d4d4e';  -- St. de Maagd van Enkhuizen (was 503405)
UPDATE klanten SET debiteurennummer = '503788' WHERE id = '255b0e9c-2595-4601-8314-c3ff45f9e087';  -- St. World Seed Experience (was 504020)
UPDATE klanten SET debiteurennummer = '504375' WHERE id = 'c08eadec-84f3-4f32-9346-882a7eb633b2';  -- St.Caecilia koor (was 503488)
UPDATE klanten SET debiteurennummer = '503490' WHERE id = '31a4bac9-5d86-40db-b94d-54093fb37577';  -- Stadswerk 72 (was 504299)
UPDATE klanten SET debiteurennummer = '504366' WHERE id = '8dc57e79-e105-4c3c-b92d-3eacec578f66';  -- StarGallery (was 503497)
UPDATE klanten SET debiteurennummer = '503503' WHERE id = '430020b3-8104-4937-9171-603d743ffed1';  -- Sterkliniek West-Friesland (was 504288)
UPDATE klanten SET debiteurennummer = '503611' WHERE id = 'e9ed0ab1-dfe4-433b-b2c5-fc22b3c90a5c';  -- Stg. Muziekschool Stede Broec (was 504188)
UPDATE klanten SET debiteurennummer = '504131' WHERE id = '31787131-36bb-4ec7-9ca3-f5dfe637c481';  -- Stg. Ouderenzorg Wilgaerden / Westerhof (was 503715)
UPDATE klanten SET debiteurennummer = '503992' WHERE id = '545e92d7-ad94-4ec2-8e72-a4a643f78218';  -- Stichting Decuria Events (was 503844)
UPDATE klanten SET debiteurennummer = '504244' WHERE id = '9adabb99-734f-4409-973e-b8a3cab30427';  -- Stichting Fonds Zorgprojecten van de Stichting P (was 503607)
UPDATE klanten SET debiteurennummer = '504198' WHERE id = '07680ae6-47c2-44cc-ac68-e08b52f30505';  -- Stichting Marketing Enkhuizen (was 503652)
UPDATE klanten SET debiteurennummer = '504260' WHERE id = '8f547f75-6c53-4a49-95c4-e77694049d36';  -- Stichting Noorderkerk Hoorn (was 503592)
UPDATE klanten SET debiteurennummer = '503673' WHERE id = '8b7dee90-288e-4e19-b1aa-9eb820a2e53a';  -- Stichting Sint Jozef (was 504130)
UPDATE klanten SET debiteurennummer = '504298' WHERE id = '84e83638-aea4-4393-8666-6782819d6218';  -- Stichting Vrienden van de Zuiderkerk te Enkhuize (was 503557)
UPDATE klanten SET debiteurennummer = '503298' WHERE id = '313f800f-66f8-4ae1-9b9e-63b2ea9e53f4';  -- Stockhunter Projects (was 50848)
UPDATE klanten SET debiteurennummer = '503546' WHERE id = 'e31d67f6-ee70-4a58-99ad-5d79cc7c8a89';  -- Strandpaviljoen ''t Badhuys (was 504248)
UPDATE klanten SET debiteurennummer = '503604' WHERE id = '692468a4-d319-4fa7-b5f0-44f3c87e5a1d';  -- Stressless Massage (was 504195)
UPDATE klanten SET debiteurennummer = '503938' WHERE id = '9466d554-666d-42a5-8ef3-c73e9d748820';  -- Struction (was 503892)
UPDATE klanten SET debiteurennummer = '503917' WHERE id = 'b86381b7-798a-496f-902d-71a61e07eac1';  -- Studio Carrousel (was 503906)
UPDATE klanten SET debiteurennummer = '503799' WHERE id = '7e3bbcb5-df43-4629-a860-3dbea297bed2';  -- STX Service Group Europe BV (was 504009)
UPDATE klanten SET debiteurennummer = '504235' WHERE id = 'ca3ab4f3-c8a5-498c-9a16-e4b2b3a6ccf5';  -- Super Duplex Hulls B.V. (was 503616)
UPDATE klanten SET debiteurennummer = '503578' WHERE id = '1f4cfaff-0dd5-4ef0-9968-0dc252ae0e32';  -- Superior Yachts International B.V. (was 504219)
UPDATE klanten SET debiteurennummer = '503482' WHERE id = '1a28ec32-99f7-4424-b032-1abc6c5ca6af';  -- Supertrash Retail B.V. (was 504307)
UPDATE klanten SET debiteurennummer = '20190650' WHERE id = '3e75fa1b-6bbc-4eff-93e8-ec1d685bcd47';  -- SW Dakwerken (was 504411)
UPDATE klanten SET debiteurennummer = '22685' WHERE id = '342351de-4ccc-4076-94f9-8a3c1b617a73';  -- Syngenta  (was 504350)
UPDATE klanten SET debiteurennummer = '504169' WHERE id = '75bc84de-bbb2-481d-a134-eba855565fce';  -- t Pakhuis Tandarts Hoorn (was 503681)
UPDATE klanten SET debiteurennummer = '2150312' WHERE id = '6d676016-71d0-4147-8e83-b3384f24df23';  -- Tabor College (was 503450)
UPDATE klanten SET debiteurennummer = '503752' WHERE id = '91dced9b-9e0f-4253-b9d6-eb8ffee1bd03';  -- Tamworth Hoeve (was 504054)
UPDATE klanten SET debiteurennummer = '20190408' WHERE id = '686c24b4-7028-4cf8-aa68-b500675d5f38';  -- Tandartspraktijk Lancee (was 50720)
UPDATE klanten SET debiteurennummer = '503828' WHERE id = '79fc0d7c-4c71-47e6-8920-9c58b6976389';  -- Tattoo Enkhuizen (was 503980)
UPDATE klanten SET debiteurennummer = '20190345' WHERE id = '9bd18c97-e28d-477f-b02d-3c0e68249a38';  -- Taxi Centrale West-Friesland (was 24561)
UPDATE klanten SET debiteurennummer = '504182' WHERE id = '1c509988-876e-4378-98b0-8143807c90a0';  -- Taxi Tromp B.V. (was 503668)
UPDATE klanten SET debiteurennummer = '2150357' WHERE id = '63807f32-1e41-4f5e-9950-17b5840dbe9d';  -- TDW Techniek B.V. (was 504295)
UPDATE klanten SET debiteurennummer = '20190500' WHERE id = '82f192e9-c09e-4e68-9cb5-12b92fe0aa5e';  -- Teal Agro Technologies BV (was 504235)
UPDATE klanten SET debiteurennummer = '504326' WHERE id = '30d092a7-103e-4c28-bc78-2f641370be74';  -- Team Sportservice West-Friesland (was 503529)
UPDATE klanten SET debiteurennummer = '503751' WHERE id = '83d5e4a2-fc76-4006-a1bc-2c2e0e4405f9';  -- Teckru Projects B.V. (was 504055)
UPDATE klanten SET debiteurennummer = '50252' WHERE id = '9b6b46d6-b10b-4561-9165-ab125b2e477e';  -- Tecmoteam (was 39957)
UPDATE klanten SET debiteurennummer = '20190646' WHERE id = 'b45ed2bd-91d3-490b-96f3-a9765ccfd7c3';  -- Teer Makelaars (was 504365)
UPDATE klanten SET debiteurennummer = '503813' WHERE id = '81da2c1c-defb-47d4-9559-975d1532908d';  -- Terschelling Photography (was 503995)
UPDATE klanten SET debiteurennummer = '503676' WHERE id = 'bd95b035-872a-4a65-9038-1284183cff1d';  -- The Dogbarn (was 504127)
UPDATE klanten SET debiteurennummer = '504143' WHERE id = 'c4b69af4-281d-442a-b8e3-e8737f9864a5';  -- The Innovative Group B.V. (was 503704)
UPDATE klanten SET debiteurennummer = '504241' WHERE id = '66568d14-dc6b-408b-8272-a6db4cf86f85';  -- Thiery Mullens (was 503610)
UPDATE klanten SET debiteurennummer = '503978' WHERE id = '28d4f0f5-04c4-430a-a737-0dd255c9d1a8';  -- Thomas huis (was 503857)
UPDATE klanten SET debiteurennummer = '504237' WHERE id = 'b8981b9b-7632-4909-a56c-dc0b97194e8b';  -- Tierlantijn Wonen (was 503614)
UPDATE klanten SET debiteurennummer = '20190355' WHERE id = 'c825ab98-fe06-4ef8-bac4-f80633cddf71';  -- TIF creative concepts (was 27735)
UPDATE klanten SET debiteurennummer = '2150332' WHERE id = '983e2760-6deb-4c8e-87d7-1ecb83d3288b';  -- Timmerbedrijf Blokdijk (was 504293)
UPDATE klanten SET debiteurennummer = '2140304' WHERE id = 'ac370560-9b94-40ef-8738-efa646745b2d';  -- Timmerbedrijf G. Jong (was 50882)
UPDATE klanten SET debiteurennummer = '20190642' WHERE id = 'af91f46c-da7f-46e7-9207-9b5640c9205a';  -- Timmerbedrijf Rogier van Montfort (was 504366)
UPDATE klanten SET debiteurennummer = '504317' WHERE id = 'b5435dae-5c2f-4f84-b66e-5727890dd57f';  -- Tiny House World (was 503538)
UPDATE klanten SET debiteurennummer = '503886' WHERE id = '59302399-c034-427c-8572-74cbe89f865e';  -- TjoekTjoek.nl (was 49968)
UPDATE klanten SET debiteurennummer = '504261' WHERE id = 'fb2d3ed9-1ee7-4c00-bd5f-5368e1a00ea1';  -- Tom William (was 503591)
UPDATE klanten SET debiteurennummer = '503685' WHERE id = '91579e55-4ba0-4ebd-8a68-d13d4df2ca57';  -- Tony Horecasolutions (was 504118)
UPDATE klanten SET debiteurennummer = '20190521' WHERE id = 'a32ef520-5a16-4467-b124-5ad220d9c2d0';  -- Topdak Dakbedekkingen BV (was 504029)
UPDATE klanten SET debiteurennummer = '20190381' WHERE id = 'd4482668-02c5-4b11-8c23-4db5f8901be7';  -- Training, coaching en therapie (was 50333)
UPDATE klanten SET debiteurennummer = '503995' WHERE id = 'de679664-dbf5-4570-bda0-f6d9a863d7bf';  -- Trainingsschool AW Enkhuizen (was 503841)
UPDATE klanten SET debiteurennummer = '503750' WHERE id = 'e8eed407-9a18-4acf-9033-6a6d5a01902d';  -- Transferro (was 504056)
UPDATE klanten SET debiteurennummer = '503965' WHERE id = '7fb317be-10f0-4f72-8706-b627518e4565';  -- TSH Timmerbedrijf (was 503869)
UPDATE klanten SET debiteurennummer = '503947' WHERE id = 'fcb1cd7d-caef-4515-b1bc-e710fb95825e';  -- Tuin & huis kluzz (was 503885)
UPDATE klanten SET debiteurennummer = '504043' WHERE id = '7ee3a376-7645-4321-8924-ffb4b5ebaf88';  -- Tuitel Smart Logistics (was 503798)
UPDATE klanten SET debiteurennummer = '20190505' WHERE id = 'ec721f13-e172-469b-873b-a01958d59de1';  -- Tulpax (was 504229)
UPDATE klanten SET debiteurennummer = '2150322' WHERE id = '17cb70e1-36a5-42eb-9989-b9c537ea2002';  -- Tweemaster (was 503479)
UPDATE klanten SET debiteurennummer = '503786' WHERE id = '5be1889f-fb2b-4298-a7cf-170d7eb9b27a';  -- Uitvaartverzorging Pennekamp (was 504022)
UPDATE klanten SET debiteurennummer = '504199' WHERE id = '8fd9cadd-52fe-4903-805b-22773f160cc5';  -- Umai Fushion (was 503651)
UPDATE klanten SET debiteurennummer = '504204' WHERE id = '06e918fa-4260-470b-a4e3-f5e87eed1d69';  -- Umai Fusion (was 503646)
UPDATE klanten SET debiteurennummer = '503814' WHERE id = 'ca3d2bcc-658f-4510-b0f5-721930eda02d';  -- Uniborge Shipping (was 503994)
UPDATE klanten SET debiteurennummer = '503766' WHERE id = 'fa9396df-0953-4388-abc1-f8dd5934f3a9';  -- Unitverhuur Drechterland (was 504040)
UPDATE klanten SET debiteurennummer = '2140300' WHERE id = '13880fe3-5e82-4491-b70e-34ba8568c4ed';  -- v.o.f. Eensgezindheid (was 50880)
UPDATE klanten SET debiteurennummer = '503986' WHERE id = '2e0fa963-d7f0-4606-a493-4556577971bb';  -- Vakantiepark Het Grootslag (was 503850)
UPDATE klanten SET debiteurennummer = '504063' WHERE id = 'd496fa5d-85ec-4c99-b1b7-ca9289053d66';  -- Van den Enden Electrotechnische Dienstverlening (was 503778)
UPDATE klanten SET debiteurennummer = '504076' WHERE id = '516decc9-6151-48ac-9643-f0386c3469af';  -- Van Diepen Van der Kroef Advocaten (was 503767)
UPDATE klanten SET debiteurennummer = '503243' WHERE id = '612e4b55-edeb-493e-9474-11f6105c01f9';  -- Van Dijk Design (was 50762)
UPDATE klanten SET debiteurennummer = '503959' WHERE id = '7b047a58-11c1-4541-a7dc-1d945d6c550b';  -- Van Mossel Autoschade (was 503874)
UPDATE klanten SET debiteurennummer = '504061' WHERE id = '02e9d168-c42b-4150-927b-3169ab5c0c86';  -- VD Holland I B.V. (was 503780)
UPDATE klanten SET debiteurennummer = '20190631' WHERE id = 'd106c731-2acb-46ed-9aba-1774616b99a1';  -- VDB Health (was 503970)
UPDATE klanten SET debiteurennummer = '504224' WHERE id = '3848f0fb-43fc-4fe6-9a02-e7fed2f14367';  -- Vectura (was 503627)
UPDATE klanten SET debiteurennummer = '20190318' WHERE id = '8c19451b-4a9b-41ef-ac35-6bd8a39fb1d0';  -- Veenstra Multiclean (was 504059)
UPDATE klanten SET debiteurennummer = '504157' WHERE id = '257e1aef-7f88-47b0-8ca9-bc8b2e829d8a';  -- Vek-Wik (was 503693)
UPDATE klanten SET debiteurennummer = '503958' WHERE id = '2c47644f-5118-48c9-94d6-04eaac41cde9';  -- Veldboer Eenhoorn Horeca en Grootverbruik (was 503875)
UPDATE klanten SET debiteurennummer = '2150282' WHERE id = 'd0511d28-21d7-46a1-a2a8-af9e51c9493b';  -- Velutech Verwarming & Luchttechniek (was 50471)
UPDATE klanten SET debiteurennummer = '2150330' WHERE id = 'fbf34013-405e-41d1-a0af-9acac80aec0f';  -- Ventis Scheepstimmerwerk (was 503494)
UPDATE klanten SET debiteurennummer = '503524' WHERE id = 'ae9cd055-fb13-4894-bd5e-4142ba9c8ef3';  -- Vereniging Buyshaven (was 504268)
UPDATE klanten SET debiteurennummer = '504069' WHERE id = '3f88c481-f380-43fb-92b2-e32ff992a0a9';  -- Verkade Beddenspecialist (was 503773)
UPDATE klanten SET debiteurennummer = '20190450' WHERE id = '8e793aba-20e4-45bf-9414-2df4b6968715';  -- Villa Enkhuizen Bed & Breakfast (was 50971)
UPDATE klanten SET debiteurennummer = '20190538' WHERE id = '3859ef5d-bf63-4fa2-be2e-b9791b8b063b';  -- Virtual Solutions Holding BV (was 504185)
UPDATE klanten SET debiteurennummer = '20190433' WHERE id = '608eb6c3-1850-4ff8-850f-93bc43b54031';  -- Visspeciaalzaak Jan en Erna (was 50913)
UPDATE klanten SET debiteurennummer = '504030' WHERE id = '5fae6643-c959-41a6-9259-20f9fd491b18';  -- Visspecialist Steur (was 503810)
UPDATE klanten SET debiteurennummer = '503873' WHERE id = '40187982-6c5d-41de-bc4c-b519d38155ae';  -- Vloerglijders (was 503944)
UPDATE klanten SET debiteurennummer = '504144' WHERE id = '546fb80e-22f4-4a1e-96a5-d0f9e672066b';  -- VMG Yachting B.V. (was 503703)
UPDATE klanten SET debiteurennummer = '504271' WHERE id = 'eed01353-4eb0-46e1-9757-9833cdf299e1';  -- Voordeligeautos.nl (was 503583)
UPDATE klanten SET debiteurennummer = '2150341' WHERE id = '00ba9997-078f-4cc9-898e-e12ddb494d40';  -- Vredeveld Training en Advies (was 504284)
UPDATE klanten SET debiteurennummer = '20190539' WHERE id = 'a692154e-b854-428d-a1ef-ec8879c60129';  -- Vrijwilligerspunt (was 504184)
UPDATE klanten SET debiteurennummer = '504050' WHERE id = 'e01d9b15-6c23-4523-a327-d6080bd302e9';  -- VvE Noorderpoort (was 503791)
UPDATE klanten SET debiteurennummer = '503811' WHERE id = '58e35a3e-f701-46a5-ad5d-ffac6c7147bb';  -- VvE Oude HBS (was 503997)
UPDATE klanten SET debiteurennummer = '504318' WHERE id = '64f0e7be-fae5-4a8e-988e-78213b0211b7';  -- W. Koelewijn schilderwerken (was 503537)
UPDATE klanten SET debiteurennummer = '27284' WHERE id = '395e7cad-2ded-4fda-bb5d-03c6533a187a';  -- Wagner installatietechniek (was 503908)
UPDATE klanten SET debiteurennummer = '504214' WHERE id = 'ff4a6b6e-6370-4aa1-828d-adf13e1a1bb4';  -- Walter Richter (was 503637)
UPDATE klanten SET debiteurennummer = '503300' WHERE id = 'b50e3bb8-6d88-4e00-98ec-eaca2f752a8d';  -- Waterzorg Friesland (was 50869)
UPDATE klanten SET debiteurennummer = '20190593' WHERE id = '6775ea97-1c95-4a18-8944-f69a1e742c2e';  -- WBG  Enkhuizen (was 50753)
UPDATE klanten SET debiteurennummer = '504181' WHERE id = '88cc64ec-1e55-4ede-a66e-6377b481e3ae';  -- Wegro V.O.F. (was 503669)
UPDATE klanten SET debiteurennummer = '503271' WHERE id = '68566577-703c-43fe-b7ea-52f217f70e05';  -- Welzijn Stede Broec (was 50678)
UPDATE klanten SET debiteurennummer = '20190464' WHERE id = '1aed3bc9-ad76-4849-93c0-eec795540aad';  -- WestCord Aparthotel Boschrijck (was 51023)
UPDATE klanten SET debiteurennummer = '503908' WHERE id = '2702ae6e-068a-4280-9817-bb459a2cd5ce';  -- WestCord Hotel Arsenaal Delft (was 503915)
UPDATE klanten SET debiteurennummer = '504112' WHERE id = 'b38c6150-2a0d-45e5-a14d-be0068014d70';  -- WestCord Hotel Eindhoven (was 503733)
UPDATE klanten SET debiteurennummer = '503780' WHERE id = '64475fa5-0aba-4937-9059-ac74db9e50d1';  -- WestCord The Market Hotel (was 504028)
UPDATE klanten SET debiteurennummer = '504167' WHERE id = 'f71d3d33-e2b3-4850-8421-1ff1e92b338c';  -- Wester Group B.V. (was 503683)
UPDATE klanten SET debiteurennummer = '503675' WHERE id = 'b2d64964-4414-435a-a000-f6313fead15a';  -- Westers Investments (was 504128)
UPDATE klanten SET debiteurennummer = '503819' WHERE id = '9a166519-a0d8-4c95-8e35-f50223b73fc9';  -- Westfriese Kluscentrale (was 503989)
UPDATE klanten SET debiteurennummer = '503723' WHERE id = '9cd75247-cd29-4d42-9319-39b299cb0761';  -- Westfriesgasthuis Waterlandziekenhuis (was 504082)
UPDATE klanten SET debiteurennummer = '504097' WHERE id = 'dbb9bafc-6962-4a6a-8090-068cf486f439';  -- Wiek Luza, Training, coaching en therapie (was 503747)
UPDATE klanten SET debiteurennummer = '504200' WHERE id = 'f94a2452-e2e6-4b5e-b026-b08ef4ce9f66';  -- Willem strating (was 503650)
UPDATE klanten SET debiteurennummer = '503911' WHERE id = 'a404b8cc-e510-4137-b554-58e4175ff0ef';  -- Wings of change (was 503912)
UPDATE klanten SET debiteurennummer = '503730' WHERE id = '6734d279-43aa-4599-a41b-92b555116d8a';  -- Winkeliersvereniging Koperwiekplein (was 504075)
UPDATE klanten SET debiteurennummer = '504035' WHERE id = '2c8e1614-5871-4bb0-a327-1a3c1bd19eef';  -- Winkelstad Enkhuizen (was 503805)
UPDATE klanten SET debiteurennummer = '50994' WHERE id = '6c8a8b1c-28b0-4912-a052-0b867fccd103';  -- Wolf Honden uitlaatservice (was 50651)
UPDATE klanten SET debiteurennummer = '2150257' WHERE id = 'ca76aa2b-813b-4946-9710-9598591540da';  -- Woonwinkel ''t Klooster (was 24469)
UPDATE klanten SET debiteurennummer = '504166' WHERE id = 'e201aced-ee8a-49b9-a9b9-c112aba30d8d';  -- Wrapped-Mc (was 503684)
UPDATE klanten SET debiteurennummer = '503710' WHERE id = '36931125-b027-427a-a3ab-f5479475cf91';  -- Wrinkle Works (was 504095)
UPDATE klanten SET debiteurennummer = '504100' WHERE id = 'baed9b49-509a-4789-9ffb-483abcad6d02';  -- Y-design Customs (was 503744)
UPDATE klanten SET debiteurennummer = '504098' WHERE id = '4409c789-8dd5-4ce3-8ed5-06c73262a59c';  -- Yeti Acoustics (was 503746)
UPDATE klanten SET debiteurennummer = '504088' WHERE id = '61db0745-32a4-4b7d-bbb6-944e45cc0792';  -- YogaTherapy4You (was 503756)
UPDATE klanten SET debiteurennummer = '503715' WHERE id = '473d4e48-6838-45fa-85b2-8f069b157dca';  -- YRVG Salon Cosmetique (was 504090)
UPDATE klanten SET debiteurennummer = '504013' WHERE id = 'a0029618-3c8e-4ceb-82cc-285d5c52416d';  -- Zeilmakerij Enkhuizen / De Vries Sails Enkhuizen (was 503823)
UPDATE klanten SET debiteurennummer = '504012' WHERE id = 'b5a282ee-3b13-4bad-b088-0a68418a91a7';  -- Zonne-Man B.V. (was 503824)
UPDATE klanten SET debiteurennummer = '29919' WHERE id = 'e124e956-a540-4bf8-be06-c672bc8e29bf';  -- Zuiderzeemuseum (was 503472)
UPDATE klanten SET debiteurennummer = '504217' WHERE id = '3d6ca907-5eac-49bb-a631-8761a68f5fc7';  -- Zuydergym (was 503634)
UPDATE klanten SET debiteurennummer = '504187' WHERE id = 'df6e5a00-004e-4cd1-838c-f2f86a18149a';  -- Zwemschool Weidevenne (was 503663)

-- Controle: 'met_nummer' moet 590 zijn, 'zonder_nummer' 172
SELECT
  count(*) FILTER (WHERE coalesce(debiteurennummer, '') <> '') AS met_nummer,
  count(*) FILTER (WHERE coalesce(debiteurennummer, '') = '')  AS zonder_nummer
FROM klanten
WHERE id IN ('6c8a8b1c-28b0-4912-a052-0b867fccd103','ca76aa2b-813b-4946-9710-9598591540da','92212f51-afb1-49e4-953a-847a6699bc8a','6643c08d-961e-4c44-9e2b-4cc54e0d7e5c','7dac22ae-d670-4172-af12-c851c85e3671','8dc57e79-e105-4c3c-b92d-3eacec578f66','63a912ea-a0a2-4ff8-b537-f8ec23f1950f','e9bce61a-a66f-4ac8-94bc-6e6b3449962d','3848f0fb-43fc-4fe6-9a02-e7fed2f14367','ff4a6b6e-6370-4aa1-828d-adf13e1a1bb4','c08eadec-84f3-4f32-9346-882a7eb633b2','7e29e1df-fbd5-48ea-8268-066d5c7df1b6','31787131-36bb-4ec7-9ca3-f5dfe637c481','e124e956-a540-4bf8-be06-c672bc8e29bf','7b132253-376e-4e0d-9df4-e33881dd6379','30d092a7-103e-4c28-bc78-2f641370be74','30f3f79d-c799-4bd7-a029-9dbea8a6af11','9dcc541b-d96b-4b20-9ff2-12fbd90d00ac','eb4c630e-6066-45ea-8265-6de8037fd23f','f922d4d8-a873-4c00-add1-36cfdd528b08','66568d14-dc6b-408b-8272-a6db4cf86f85','f94a2452-e2e6-4b5e-b026-b08ef4ce9f66','51e6e199-c192-4c13-bbaf-92454e3397ca','1fd67701-5282-41ef-a8a5-3e0622ec9a9e','5b3c2cbc-bf31-428a-8e82-a6d53920fd99','79728601-2e6a-442f-9130-899e3f5e086e','eb88cfb8-b1e9-4462-8d49-a05a63ef1c51','25fc4bec-3a70-49a8-93e9-de7870495ab2','fdda46bb-3ed2-4f4d-8584-1b53f5c2366a','8a8a1a65-d975-4935-ab00-2e5f5b186dff','b59f275e-a006-4b9d-96ea-927917ca9db5','41b887e7-aed3-471a-adf0-c1cc6d04d3e0','8f547f75-6c53-4a49-95c4-e77694049d36','b4e32d68-f3f0-4901-9484-36c971507f2b','9d62f307-4efa-4741-8cba-662e7900fd21','6701d456-88b4-42a3-ba64-1ead22fe8448','3e75fa1b-6bbc-4eff-93e8-ec1d685bcd47','7577336e-b023-4e14-a336-e5d92311f523','248f2619-f5cb-4dbc-ac63-b99dc0f85078','6888de92-ce93-4809-b481-ded7900818c7','b6a456c5-e583-4609-8bf9-01ac396866d2','0bf7b3dd-b21e-4efa-9a22-abf5ec9f0ef6','487557ac-e892-428e-9cbc-7e5d373cc24e','727bbf4a-71c1-4d1b-9684-6d0551e93a49','521c38cd-10af-49dc-8b34-a1fb14d62665','b4b797ab-e5f6-48d2-b7ec-1133027adf6c','0953f1df-d357-41bb-8c82-a0b6b0cb2673','a0678853-546b-4497-a01b-9e064355494e','68671afc-98fd-4210-9847-b1d199cf395c','97ac452f-fb5f-4b29-9e61-886702e9e07e','18b5044e-fef7-4555-b1f5-66a592a3be2b','d106c731-2acb-46ed-9aba-1774616b99a1','5fae6643-c959-41a6-9259-20f9fd491b18','32730a86-a26a-4e42-b135-e0b6f254a423','f2d9b852-5ce4-4b70-9a84-b107f5f517b3','2e0fa963-d7f0-4606-a493-4556577971bb','16ecee09-cb71-425f-a8d7-02313091d454','5bd12fc8-945b-44b7-8428-cfd8637581cd','79fc0d7c-4c71-47e6-8920-9c58b6976389','111e015b-3bb6-49ec-9eae-e3274abb625d','1630e1e8-ed79-400b-bfd2-3d9dbf80d906','59302399-c034-427c-8572-74cbe89f865e','970abf9c-5170-40aa-b137-32c932189457','91b7f767-243e-4239-a07e-e4f2a6024358','f3ca90ef-15ca-4ae5-bbd1-d2701470db23','5092e1b3-af66-4ecc-af76-3fa48373f3ac','6b50b97e-5ffc-485d-96e9-0abc3de2e183','036d452b-36a5-4d06-b4f6-30a98503b86c','4d09cf36-fec7-46ef-9dfa-d5d7c4efe96a','f166a202-a4d7-404b-847c-59ae734d21d3','7f418521-ed30-4a12-9723-4e9114d506dd','5bd1e99c-25d6-46b2-9a1e-17228e39dcc0','2f569126-9b5d-45d9-a684-9c64359a9808','2d77d771-c6b4-452a-a0c5-0ba4d338637a','144e8d71-0e98-4347-ae0e-12f57dd10f5c','50de6896-0c99-4053-a90a-faf68f69b007','c621c359-4432-4483-91ac-97bd4e6f4a8e','2a1c4ede-bf09-4a05-b116-67bb9a309d67','5b123fec-d744-4375-8d07-621ea4f9874a','e01d9b15-6c23-4523-a327-d6080bd302e9','de679664-dbf5-4570-bda0-f6d9a863d7bf','92f82fb6-332b-48d8-b4ef-f962e4fe9e51','97a92b07-2492-4254-93a5-3a03733ad204','c230798d-e9b4-4a33-8302-e6d07ae181c5','545e92d7-ad94-4ec2-8e72-a4a643f78218','2792ef28-f9a5-454e-b45e-7d4b755cae97','7b047a58-11c1-4541-a7dc-1d945d6c550b','b1c25692-995e-45b7-b0cd-ba431a619b03','40187982-6c5d-41de-bc4c-b519d38155ae','5e9ded31-809e-42a7-b7c2-761868aee410','01dee018-7d02-47b7-bd13-21d29456775b','860d3722-867c-4e17-8bf7-330c835bf29e','2c8e1614-5871-4bb0-a327-1a3c1bd19eef','40b85439-595c-458e-b533-88723e3839ea','fcb1cd7d-caef-4515-b1bc-e710fb95825e','4409c789-8dd5-4ce3-8ed5-06c73262a59c','06a90e72-a0c5-4671-a945-a73440976740','533a0cfc-a425-46d6-885f-26a0e603fb5a','74bbbf14-5f57-4f60-9738-7bd66cea5299','26a59685-76b8-493c-b4b0-3232a6d77c85','2648546b-7ab2-4365-8aa9-5da6c005bfdb','0e83dc3a-a98d-4fac-a1ca-5f54aee3597e','272ecbe2-f698-4452-9dde-ecb07495684d','104c66e6-f864-4e45-a87c-7aa5b199467f','83e04b35-5a21-4f0c-b4bf-b3eafdb968bb','bb8f4afe-8760-419a-926d-c7fa9aedf369','e98ddc1e-dc7c-4bdd-95c4-a25b5c8659f9','48443a6b-9fbf-4736-bb08-5fb5a7361381','d10ae6e6-a6b3-4401-a0e9-351f0cc7c281','28d4f0f5-04c4-430a-a737-0dd255c9d1a8','eb9a84ee-a51b-439d-aa97-5d866ce2cbce','8eb87b5e-9e1d-45fb-abd5-28918aae05f3','c4bca396-d21a-4a9a-bd3d-90e81c8d6be5','e3163626-a7d7-4d21-9cc4-8872d03875d6','65514526-9e7e-49ea-ad34-8e234c20eb60','89b81d9d-9f18-47ba-9100-82c321375159','c72cabee-b01d-441d-80cf-8a5193026b28','92131ddb-f99a-4159-8ea8-8ec7c5985b95','9e94e33f-d5c7-4405-84a1-ee442048be8f','8d0e04e8-2d9c-43a4-890b-4d6f4174c567','a404b8cc-e510-4137-b554-58e4175ff0ef','6cc955f6-556c-4add-ace4-972c39511e84','287a1ba3-7564-4611-8076-9c108d30fbbf','53dcf131-2e06-485b-ab06-7e3f8a008b34','393c78d8-d08a-4af5-8d85-56fa1b261f47','ea6c13f9-e961-49b3-a354-c3182441822f','430020b3-8104-4937-9171-603d743ffed1','4d64eb0d-d9d1-417a-a42c-5eabb6bfbd50','3b432a31-6c00-4f31-800b-a3124ab6476e','04fbfc0a-cd48-4571-9079-7002ee22eb67','1fcc2441-5d86-45ac-b757-a533ff44e560','6d1c73db-eadc-4274-9e9b-d8bada76c724','5a2d34cc-c6a5-4a6d-ac24-e3cd381b12f5','a7d15993-3249-45e7-934c-40b0d094c5ca','344f1ca0-58ba-4b04-aa13-c53e02a9ee1e','b98549f6-b8a3-4a2a-ad08-9ee25b901cef','2702ae6e-068a-4280-9817-bb459a2cd5ce','1ee8e05f-51c0-4d5e-95f6-af36c19d731b','06042bde-3e34-47e2-b3be-266ddef2d2a4','9c119b0c-e27a-47a4-bb1d-ad473f8f21fa','f470e91e-038f-4b0f-81c1-91d141f6d4fb','b45ed2bd-91d3-490b-96f3-a9765ccfd7c3','b38c6150-2a0d-45e5-a14d-be0068014d70','3711653d-00ec-49d1-bc6e-dfcb1798a3a1','af91f46c-da7f-46e7-9207-9b5640c9205a','342351de-4ccc-4076-94f9-8a3c1b617a73','e4f4363b-2cca-4c6a-b955-7291701498c0','ba246e76-777b-4802-b307-0deba20c2a62','efa4e2a1-84c6-4194-aa9d-0749904444e0','04e1fbca-9e0c-4fdb-8b9e-032aa42fc29e','68bcb3b8-cf08-4d04-8a98-8e83fe24f2a7','38460c51-ee1c-48b0-8858-dec71927ef00','cb252fc0-e165-4cb3-a1bc-616617d1e159','f89448f4-fcc6-42a8-98e2-ed68a533343c','a20da275-a491-4cf1-b6be-7285d3ae2cba','4fdd3614-3fa4-4e94-a61d-e469456036bf','f60f334e-210e-4cdf-bc63-087dcdfcd504','aa0d8f98-096a-459d-bfb6-dea1317a944c','e3d4edf8-ac35-45e7-8e71-a48f69b42fe1','e5ed738e-0aa6-4996-a4a7-633a0ca52b04','cc3c1d98-7458-4e55-8bc0-d66625f3acd4','65835a99-9131-45a0-93b4-78787cf620e0','0c25bbf4-4401-4dd4-bcb0-f79b58955fc9','2790bd4c-a18d-4147-880a-f2974927bff1','95a20aec-7fe7-4808-a1dc-beee4bfc210a','ec7459dd-3cfd-4433-936f-d98a1db58757','9d458329-adcc-44ee-b06e-a6d37c38ef16','970ab68c-7c8c-4fe6-b16a-cfb3a86b2751','313f800f-66f8-4ae1-9b9e-63b2ea9e53f4','6d676016-71d0-4147-8e83-b3384f24df23','686c24b4-7028-4cf8-aa68-b500675d5f38','9bd18c97-e28d-477f-b02d-3c0e68249a38','9b6b46d6-b10b-4561-9165-ab125b2e477e','c825ab98-fe06-4ef8-bac4-f80633cddf71','ac370560-9b94-40ef-8738-efa646745b2d','d4482668-02c5-4b11-8c23-4db5f8901be7','17cb70e1-36a5-42eb-9989-b9c537ea2002','13880fe3-5e82-4491-b70e-34ba8568c4ed','612e4b55-edeb-493e-9474-11f6105c01f9','1065ffcf-c377-49a5-9353-ac5b051a1b4b','9466d554-666d-42a5-8ef3-c73e9d748820','f1922662-4312-4f4d-abd8-8b4abdb6b381','1ca7807a-5c7b-48b5-a2ab-4b6367ff7de5','d0511d28-21d7-46a1-a2a8-af9e51c9493b','fbf34013-405e-41d1-a0af-9acac80aec0f','8e793aba-20e4-45bf-9414-2df4b6968715','8fd9cadd-52fe-4903-805b-22773f160cc5','75bc84de-bbb2-481d-a134-eba855565fce','94b4c909-83c1-421e-83be-2dc7e9e0551d','3c4ed447-c14c-46b4-8542-08baa5607529','df6e5a00-004e-4cd1-838c-f2f86a18149a','257e1aef-7f88-47b0-8ca9-bc8b2e829d8a','a0bbd244-818e-41ba-9784-f646267f2ddb','cf4bd664-6b96-4ac8-85c1-87695b972854','db162bb0-1bb3-416b-a394-7e1402bddcb1','84424318-f88f-473c-90e8-9b9547c124c4','d369e33e-7d29-4781-a2cc-8a46d68cbb68','f64d0a92-880e-4d5e-aad0-ff9e7b5752a6','e31e3459-1974-4e6d-a08f-242fe4be0871','60f2b133-f712-4fef-8bfc-842c572b484c','ca3d2bcc-658f-4510-b0f5-721930eda02d','0495537b-4173-4107-8043-ce7ddb9a5e84','4d298ecb-2ad5-49a3-a7cc-486b1075de61','80b6cc95-82a9-4d8e-ab8f-ba51d59b7e64','c49ad38d-bdd1-43c6-8e71-206db8da1b2d','7ec56351-da1d-4b64-924f-bf6a64fe55b6','c93316b4-85c8-4114-86bf-77e8af70253d','81da2c1c-defb-47d4-9559-975d1532908d','adfc92d5-a7a9-449e-ac5f-b4909aeaa63e','263630b3-8cbc-43e3-8675-c9c037f4a72e','4537085e-2f09-49a0-8c62-134dd3f7500c','7ae264fd-77e9-430a-882d-80eead3c9e2b','9d743de4-a184-4516-8d6d-549f40ad32d3','73814fe5-3461-4df6-a6d4-9e1f948f6d78','1f220569-39f9-4a6a-9c6d-e1ceac7fd3c2','655fbb1e-47c7-4dd8-a7f4-5106d67feaed','f456e033-d650-4926-9bc9-80ca9f175123','7e3bbcb5-df43-4629-a860-3dbea297bed2','a32ef520-5a16-4467-b124-5ad220d9c2d0','58e35a3e-f701-46a5-ad5d-ffac6c7147bb','bd559eeb-e82e-4fa2-b3c2-07172208a205','42e25453-d3b5-40fd-8380-ef47835b1490','17d7cc97-aa71-4461-ba64-f83441038c02','c4c2225a-4d20-4bef-8f31-cec6e92f2e8a','5be1889f-fb2b-4298-a7cf-170d7eb9b27a','c85c5b6c-3e61-455a-92de-91d23ac9e665','255b0e9c-2595-4601-8314-c3ff45f9e087','fa9396df-0953-4388-abc1-f8dd5934f3a9','9c70a685-2fd1-4396-9753-bb14597961e9','b9aa6388-d199-4b2b-8593-ae9f748fa8be','b23cf1f9-20d6-4d63-9a95-76e0ed1c4783','accb178e-e5ed-40f4-a91e-a3ad7b0916db','22685023-de0c-4404-8770-e7acf34270ee','a14cd635-9a49-46d6-bcec-0b79d053bbd3','84d9a480-c26d-49df-a6f7-8c4a004491d9','fbbfc358-3d6e-4cc2-81f4-dc33d23a2670','e31d67f6-ee70-4a58-99ad-5d79cc7c8a89','003649f4-9963-4e3e-b58d-ecba1cb06dda','ae9cd055-fb13-4894-bd5e-4142ba9c8ef3','6ff684af-7816-44e5-850a-25941e69136d','4f26856f-f983-44f8-ab4b-d362f6e60be3','38e9b465-0d33-4d3d-9d83-93113eaa216e','9cd75247-cd29-4d42-9319-39b299cb0761','925b65ca-f4fd-4b99-81fa-f1519de59940','c5bf7d19-9ec1-487f-91cc-70616f2ea507','5b74a851-60ab-40cf-957e-18ea5b6d3376','3548e8b7-1625-48ab-a7c2-a259aee7b790','631a2508-acba-4e0a-a8ad-2ef876969c77','f0e1b425-166c-4323-89f4-4faa6ea94393','4cc7425a-8d62-450c-9cfd-98beb793b0ad','35afeae7-f83f-435c-87d5-b793af47c538','5cf78f79-e9dc-466e-9122-b4bebb64e957','41ffabda-d02c-4ed2-b5af-33bfa0600b05','4b3cd76d-4ed9-4d4f-a720-fe85e9a8ec24','58a0b811-3ede-478d-a7fc-d0e830b69a3b','ed758882-593b-49fd-9c4e-e2e857ae6853','83d5e4a2-fc76-4006-a1bc-2c2e0e4405f9','932c3554-dad1-4b3b-877a-424e19af2988','eeaf627d-e87e-4f19-a3b7-659dadb91308','1dddff8c-beea-4a79-8e5b-f0a6da2b8dd2','f77ae4bf-e315-4f8d-9444-0973a0c4761e','a692154e-b854-428d-a1ef-ec8879c60129','8e6ee539-8eee-42b3-8d7f-d3664ed12e6f','ba2ab57e-3ce2-4b5d-a792-f52decbc2022','e8b4ed8b-16f5-4d8e-a9bf-6502bbace780','c60ecb87-2a5e-47fc-a8c7-27e4a5296456','3fb4fcdb-87d5-489b-b51b-17fb89f0f67b','983e2760-6deb-4c8e-87d7-1ecb83d3288b','b9074243-4e1b-4d9e-aeba-8d2eae85b0a5','64475fa5-0aba-4937-9059-ac74db9e50d1','5a366331-e186-40fe-99a5-1b84e2be838d','bf6b1aa9-29a9-4f22-81d9-3b1d552eaa57','6a461659-e14a-4c1a-a1fd-b6083afb7558','e5c46163-1a37-4de6-b602-922d976750ce','d8d33f2b-7276-4732-a115-b88fa16f2eb6','54628b5c-45f7-434a-b588-7bbd8d783460','bd95b035-872a-4a65-9038-1284183cff1d','bf4736cb-332e-41d7-82c1-770aae50d5e3','ae339537-1aee-47fd-8f9e-1ea691eba424','066e0d77-119f-4a34-a187-215c45ce7b5a','5a2e81cc-fc1c-4067-83cd-9255c934f282','bc8b3e33-d378-4401-bb66-fe08c9385ccb','5a7aa5ba-3992-4501-9db8-9cf04f894251','48e968fa-c88a-4ab7-bbc6-71521ed422e2','8ec4a84b-3e96-4580-ba0a-108a68338f6f','3e7e2b28-20b9-4d7a-82e1-ea61b5f55f30','2aab9cc3-7ec1-4ecc-a88a-c76f1671fbb2','69d72dbe-76e7-4cc4-bb8b-7f7716e88282','c1e8382b-a303-44d6-b3ae-72418f264200','473d4e48-6838-45fa-85b2-8f069b157dca','8b7dee90-288e-4e19-b1aa-9eb820a2e53a','50d90f6e-9e07-4257-819d-c8f2b6d3cfee','1e8ab057-cea2-4742-b865-c8b850c0a66b','7300b308-6b40-4f88-afd1-97ea550766d2','ec721f13-e172-469b-873b-a01958d59de1','46834d28-7623-4f3c-bfd9-402a31599b22','cb209d19-0834-4e7c-b13b-cf6f26c2ce0d','d9430a59-5bcc-4e9b-9d2f-f4921a023195','8139a1bc-c2be-44d6-8dd1-2794ae59f9d8','31a4bac9-5d86-40db-b94d-54093fb37577','8b6be129-de86-4405-b55e-babbd0bd2436','91dced9b-9e0f-4253-b9d6-eb8ffee1bd03','9a2e9741-7dc8-44c7-a7ae-062ca2955a63','9c5ea9a2-c28e-4b2e-96ac-17abd58e10ac','db42677f-f969-4082-b5d7-fc91aa1d7c8e','d6d597fd-bdb7-4198-8802-ac9c2169b7b5','75bf581b-7924-4b7c-b7ee-e87cfa888401','0b03314c-578e-40a3-ad49-590d677399db','79c3f8c3-4bd2-4c3c-b1bc-c193bd530773','b7387de4-626c-4151-8986-690b3bb66745','a6d76024-ebef-482b-a263-c3208e293988','4f739630-a2e8-4d20-a6ba-259eb3cbbd34','5376b382-7a07-4b65-aa9b-1791d95be678','e3f1a802-3bb5-4ba4-9b7c-d0b87ab8ae8d','4d95e4af-7941-4498-93b5-8029f16f0607','e8eed407-9a18-4acf-9033-6a6d5a01902d','6734d279-43aa-4599-a41b-92b555116d8a','eb5e4b4f-4e2f-4e96-9b49-941fc8a7e8a1','36931125-b027-427a-a3ab-f5479475cf91','04d008b7-4e10-4193-a97e-da5850b94328','1d892688-b8f7-421c-9ee8-2228223ec391','3859ef5d-bf63-4fa2-be2e-b9791b8b063b','6a3b21c5-d2db-4d58-99a3-8747f488a10d','82f192e9-c09e-4e68-9cb5-12b92fe0aa5e','e6902887-82b4-49d2-8a66-927eb5ec77aa','45b08d3e-a629-40c7-b2ae-10af6d863302','402e607c-80be-48c6-b70c-734fcc2b0ff5','63807f32-1e41-4f5e-9950-17b5840dbe9d','85cd437a-9c0d-46e0-a53d-26c0e1653c8b','ebec7598-aa40-4151-ad39-7fe1fefbed08','b2f62994-9581-46bc-9a12-64dff92c5e41','8f3e7c81-cb8b-49e6-93b1-769a7d51cdd3','63cbbc22-89bf-49fa-b5fc-a75a1c218f70','d1e40d24-fd54-40c3-9ced-a548034c100e','ba0556f3-ad4c-4c39-a64a-2d812792e27c','ef3bae30-c6fd-43b2-badc-12a31e148b14','7757744b-a0ee-4801-be45-f4b02fad0cc8','7cb821ee-2d50-4f98-b8bd-644ad098df03','9f199c7c-8b31-4861-8dcb-84cfe35fbd76','cfc409c4-b951-4b31-9ae4-59b74923f5fc','02a108fa-b0b1-4736-a95d-131c4fec8091','00ba9997-078f-4cc9-898e-e12ddb494d40','0d7a9971-ca6c-4802-a06f-ba30c46cb4b6','27d0e2f6-3d30-4e7b-8267-02eb5112a1b3','8c19451b-4a9b-41ef-ac35-6bd8a39fb1d0','45d017b8-d6b7-42fb-a956-973c4b634bda','e4a2e279-8b0d-461e-8e20-f268c5c2fc6f','91579e55-4ba0-4ebd-8a68-d13d4df2ca57','b2d64964-4414-435a-a000-f6313fead15a','321550c4-0247-4cc9-acc8-9fb56dbb8ed1','baaf70d8-5e55-42b3-837f-e54ac8ad0ad6','2645f396-4b4e-445d-84bc-8c89aef9e0f9','eb5cf722-ad11-4913-881a-381b13d9053a','6f12ec6e-ab16-4a33-8cbc-934c7f2a7721','7e293428-0b69-4242-80a4-f048a8fda09e','290206a4-992a-4fdf-b5a1-617b2a4c2732','9d52c5fc-36b4-4cdf-947a-f6fbe2c6f6bd','2e6d1e48-eccc-4daa-8ab0-0009e64fe348','d16b769a-3b6d-4383-ba1b-04439ed390bd','d9a55171-9baf-43e2-b6d2-a1283ca48697','1a28ec32-99f7-4424-b032-1abc6c5ca6af','bae191c7-3a7c-487c-81f2-a997ef1ca86d','a8caff6b-668e-41d2-ab24-2585dc557069','8ace47e4-4d0d-47f9-803e-7a06d9abe5db','71d3057a-2a6d-439f-a2b9-36131afd9925','1f7687cb-8db1-49e1-8dd7-2839bafb7dc0','b6ea4ff2-0580-49b6-ba43-bba16db6a49d','e59646be-9621-4266-9677-acb0ac60bc98','affd17ad-0143-447b-b9c8-37a1ec8a9f5d','efa5887e-d14a-4066-8e72-ebfcbea1a0fa','10cf42bb-37ea-413f-8018-e86dd60e0f1e','428c8936-0ff4-4d24-9e28-8e1de4d0691a','24c2df98-1905-4b05-87b0-d251531e45ce','3a1e2560-be79-46db-bfd6-99b155951637','0a9c2b42-a967-462f-944c-33d60fd18373','5cfaee79-6249-4a03-9a08-d3adbe77f624','b54f9d50-6cd1-4aae-8f0a-ea1335debdf6','1259b6b2-9c74-4eda-b83c-bb54fe706a4d','f123bab5-f819-4637-b5a9-ec5b95ac6fa1','ebf5de61-8eb2-415f-9aa4-a20e8eca31cf','ca3ab4f3-c8a5-498c-9a16-e4b2b3a6ccf5','2d35d12e-b5a5-4eb3-920f-d5d101f0ad4e','06e918fa-4260-470b-a4e3-f5e87eed1d69','265cdba4-c9fc-4f45-864c-3501308941b5','cbff52da-40f1-4ba3-8543-253e50ef785d','64f0e7be-fae5-4a8e-988e-78213b0211b7','84e83638-aea4-4393-8666-6782819d6218','b9ad45ff-7007-498e-a1f7-cd0c8926cd65','f41d9844-28a0-464f-9272-f10833db8a49','7423c3c6-5f50-48db-8e51-a80994c009ec','9782b7e3-9478-4036-aebc-8cac1bb325c5','608d1dde-4c30-4c37-a6c0-a2dce0b1d500','bf9b2681-dab2-4dc2-aedc-27eaba17c846','dfe3ccd5-fba8-4e4b-9676-12faadc152fd','055d0739-ef5b-47d4-800f-96342d24bcee','05c20b58-0040-4149-bc9b-c4a2b3771cf7','1e20db60-2f41-413c-8631-f81b6da37606','64e2dfa7-a6a8-4701-937f-0c8e9aaab04f','e7189971-6092-4315-8acb-29d27c078794','58d5ce1c-ad5e-4cbf-a798-22d9af4ef93e','80f7d07d-37f7-4f5a-a5d9-6fd8b0d526fd','b5435dae-5c2f-4f84-b66e-5727890dd57f','c0c096ae-6251-4df2-95e3-3faac6a7bc99','1a61c1da-36fb-4fe6-b7ac-92f06b726d91','64d81f1e-e1be-475d-ae64-1ff4e1dac246','b3ad2a03-3e34-47b6-a0dc-950a483ee8da','cee6dc54-6657-4f02-81ea-1cb602dbbdcc','b26ede11-3040-4d63-b0c6-d3d3d17e9961','1c509988-876e-4378-98b0-8143807c90a0','ad725d7f-8ae5-4542-b0a7-c0fb8aa8437a','4cbd92b8-c629-4e11-bdd4-1282d0ab0228','12df7a99-04bb-43b2-b02c-d4b048c01de4','bb01dfc8-e213-4cae-a3b5-c74dfb516127','4989e926-c185-4c2b-8ef1-12403552ae79','44fc3512-926b-4e89-b5ca-ec1aa84d25a0','15756db3-6d54-4818-9218-b801e79d928c','dce73027-354e-4a80-bf87-c23412788176','88cc64ec-1e55-4ede-a66e-6377b481e3ae','5857d580-56cf-4649-87b1-9084e8976474','9cc3ed09-651e-429a-840c-eedb45cc5472','f96652bd-a8f5-479f-bd9e-695abc984e50','bbef853a-7475-4eaa-b40c-0fbd6bb3cb04','caee102e-6640-48e2-a512-bb62de6df477','c907d635-e4f7-46e9-9e25-0569844abb5f','50d6a983-76da-481d-9064-2f15279fa314','00d069f4-7c76-42b3-9798-d7ec8ec72139','59933cf4-916d-4baf-9bcf-825717e6b95a','1a2a47fc-fca5-45a4-8b1b-fa1330bd5923','fb2d3ed9-1ee7-4c00-bd5f-5368e1a00ea1','7a1e3541-fb9b-472f-951f-9805a594dff5','506b1bd6-1c79-4756-a689-bde132ba5826','31fb8db6-c79f-4320-bc6e-1668258eeb20','0bb72777-a953-4905-a985-52b7c60221e6','f10a6431-50e5-435e-bd2a-005da5876a91','07222a1d-f1d4-4fba-a639-79171db3fe9f','daaab841-9e35-4f4b-9e31-e329daa6dbdd','ec5b9a27-b129-4603-97b2-23b49135209c','5870a568-cb1c-45a8-b6bc-62a47d410443','ce10da7a-d8fd-4ad0-8bff-cd06cf22ac1f','bd4832f2-574c-46ad-a028-b5f8f2fa35da','337a8e1d-08a2-4b24-9a83-95be53ff1dc2','c693bd24-e9e5-4a74-b292-24080e298988','07680ae6-47c2-44cc-ac68-e08b52f30505','b9e8e98c-e7d0-440a-901a-3c64a37bc4a0','e9590082-d970-4de1-a369-b1877b4581fa','a7f116f2-6cec-43fc-8fab-4c775c9e12d6','eed01353-4eb0-46e1-9757-9833cdf299e1','f71d3d33-e2b3-4850-8421-1ff1e92b338c','e03ce4c9-4df7-42b6-ac0f-8dcd76011f84','320bb549-9101-436a-8724-6c94b5392cd5','ee6bb587-dc7d-4644-a383-db1ce2b1b0da','a92decf2-e268-42f9-b1fd-67310def7f91','27962fbc-e585-474a-9603-4907356cd9d7','ff105c91-91eb-40bf-b87c-251ca4a06407','b8981b9b-7632-4909-a56c-dc0b97194e8b','3d6ca907-5eac-49bb-a631-8761a68f5fc7','764a4594-0000-411c-9995-debaaa7b157b','e9729f06-6340-4536-a81b-48fc3cc8ebbe','e201aced-ee8a-49b9-a9b9-c112aba30d8d','546fb80e-22f4-4a1e-96a5-d0f9e672066b','eaa71e7a-95d2-4969-924b-ebc815ec9744','db3bd4cd-7ae7-47c2-ba9a-3b7cf2e603ba','dc112b49-f163-465e-b7eb-7d6424cf3bfa','3fde65f9-d7a5-46e6-a598-eeb12397c4cf','e18c98cd-e1cf-433f-8e18-391230f98ee3','8c3c3bbb-7807-4d1b-8bc3-29fa28b4e687','af8a16eb-81a5-4be4-8134-693979ff5f4b','9e94c443-406d-4c17-a54d-c11c82e5b695','630e3de6-8aeb-4025-8819-1569b29da3d9','66abb40d-2fb3-42e9-b814-fdc84db84241','d53a1224-3683-42ed-8019-9696a0b6296f','c4b69af4-281d-442a-b8e3-e8737f9864a5','d0c4b24d-a8a1-4047-aa97-f07d8d1d8c3d','c87cd23c-7d79-4720-9cc3-3ee0df04d144','56d1ee58-169b-4574-9f10-ca93168f3e69','9f4081ba-8098-4525-b719-2a9fbcb86c08','29460779-a20c-4ef4-bbdf-deb8c6455fc7','02e9d168-c42b-4150-927b-3169ab5c0c86','3cf35d1d-101d-4bde-9937-09278e9dbf0f','accf9c3c-690b-4b41-b9c9-eb7f89ee3e7b','b166aeb5-c186-45da-aeb0-5dbe3a327241','b21b1fc1-7bae-446f-8e88-57d7a706ab87','35e9a78b-65fa-47df-974f-f70afa3ec213','ebb35aac-4d15-4cb0-b820-cd2ade8efb29','23c8b478-1f07-4b40-9881-802f11e02c4a','d53a87bc-0690-4d8a-9c32-6425a1f37226','3f88c481-f380-43fb-92b2-e32ff992a0a9','1df03cfc-fe61-45ee-ab6f-9f2118286897','d5a83816-2c94-410e-9350-2f4fb0777f96','a0029618-3c8e-4ceb-82cc-285d5c52416d','6281d122-03bb-49fd-9a13-98c69d5b3cca','31816b59-c936-4bba-84ae-83e91b5b67ca','b497901e-55b8-4cf7-a216-41d388e8f53a','775c9dd2-3398-4110-afb2-9fdeb6f23c14','d496fa5d-85ec-4c99-b1b7-ca9289053d66','df803851-2422-4fff-879b-657565f3a72f','7ee3a376-7645-4321-8924-ffb4b5ebaf88','fbb88086-65c4-429b-a845-14dfd4310908','a2b5c554-ce02-4953-9581-980898d87173','74bf908b-3577-4ed8-a2ca-3328ab84b401','0390a0c8-33ed-4412-b941-f14c2acd4454','33a2e208-9dde-4a22-9bc6-6a943b610df7','034ab8d7-b1ac-4547-aa79-ad6c8aad01d1','021381cb-9e7e-4011-80cc-e9d78f7e568c','cb090eee-b58e-4ff6-8778-b9eea26ab5aa','32800a44-cb3f-4f54-aa1c-1bb18a14dfe4','8339b8e4-36cf-4bff-bb55-15bcc75c3d58','6bf20d93-9cbc-4820-8960-abce78fbe704','18ab9126-3e06-42f2-91fa-3bde6e056364','71698b53-d393-41ff-889e-33c6239a2b34','705b199d-fab6-47e0-8cc2-d548cc8aa30e','baed9b49-509a-4789-9ffb-483abcad6d02','b56f19c4-d407-4543-8f93-f2a9c5617768','9482b75a-73d3-490f-b0e6-b0daed6c0afb','bd174576-e091-4638-adc5-ab13019448af','d88188c5-82d2-4b16-b627-b274eadd6abe','b5a282ee-3b13-4bad-b088-0a68418a91a7','807b5942-788a-4d30-9397-d3870c325aee','1f1a7d81-c68e-475b-a3c9-7a0fe5713ec9','7f8d5730-a8dc-48be-b691-ce5c44f6574d','2c47644f-5118-48c9-94d6-04eaac41cde9','33b971e8-e087-4478-b7ac-768fb2ecdde3','8799ae44-3f06-4bef-9811-f770c0dbfb23','61db0745-32a4-4b7d-bbb6-944e45cc0792','762a218c-3865-4d2b-b96a-5db6fc1dc4dc','bdbc56af-58f0-46ec-8abe-109b0acc43a3','e8567239-9582-4a32-9ef5-9c45a88fa805','3fbdcfb6-1f2d-4e57-9427-e90d63978905','a35fd60a-0e97-49eb-8eef-47af6c354888','b86381b7-798a-496f-902d-71a61e07eac1','895335c9-6b73-4403-98b6-0e61e32e3f6f','6f591f09-4f47-4c7e-8032-0e8ed18f9041','6f88b3fc-a69d-424f-975d-bb3477529170','b34c94b9-c3cd-45ce-8096-5c3582ffbd07','2d1bddeb-1827-4b1c-ae07-87e6ab4ef3de','7fb317be-10f0-4f72-8706-b627518e4565','6a4649df-4d18-453a-91cc-08a100a84164','d04c1262-e550-42ab-86ae-214699316f1a','dbb9bafc-6962-4a6a-8090-068cf486f439','f4b1c67f-df27-42f1-b307-8d8e19d98f29','516decc9-6151-48ac-9643-f0386c3469af','e09e4df7-3106-45a7-bd3b-275d0b038b4b','9c8954e0-67f0-493a-8666-f7f44ef8800d','843d4b54-4781-41d4-bb63-5344c9bd4fa4','cdc64cd6-472b-44b8-9d28-28abd81592fe','48bc853e-d6ea-4a83-b393-0ae24d60ede8','6f0b3a10-6f49-4c6e-af41-c0079b710eab','6a361304-e336-480b-a258-c2426b1ce025','24eb3e94-5fba-4e4f-a5e2-b64d2aa08584','223a8466-a489-40cd-8765-ad303b475311','7118397d-2b1a-4495-8be2-a8a2d5fc778b','181eaa0c-7848-4ad0-bccb-9af5656718e6','b4a180aa-4427-4461-9001-0757f693d579','be75a6de-46f2-4219-a73d-dd9e945118bb','cd48e903-4aa0-47d3-b061-1a78fd1c8f8c','608eb6c3-1850-4ff8-850f-93bc43b54031','b50e3bb8-6d88-4e00-98ec-eaca2f752a8d','6775ea97-1c95-4a18-8944-f69a1e742c2e','68566577-703c-43fe-b7ea-52f217f70e05','1aed3bc9-ad76-4849-93c0-eec795540aad','a42121c2-422c-4002-85f0-6fd0612a07aa','f094f9e9-3220-46db-80e3-4c9cbf060256','395e7cad-2ded-4fda-bb5d-03c6533a187a','0ff82308-9d46-4781-90fa-0949aebab201','c95a97d7-a76c-4f3e-944c-220781c71322','e591b5e4-4ed3-43a3-8e82-9fadd58a43dd','ac2cec57-5fe5-4057-a5e1-f604b295e3e8','82b0749b-d6b9-4ced-bde5-a8792a60cc41','1cacc7f0-077f-4428-ac76-88d955ff8fc1','8ae88dc5-6d25-4f9f-8631-356845e2b21f','746bc663-a51e-48e5-8e7e-4d418237aae5','4ad0d530-f51f-4553-82a6-dbd2056d4d4e','9a166519-a0d8-4c95-8e35-f50223b73fc9','91d1bcc0-2d61-47ba-a00d-ecb1282cbfa6','202f1b30-462b-4635-934f-4e05a05964a4','3e9cc8a2-571f-44e0-9a02-32b1cf37b9de','1f4cfaff-0dd5-4ef0-9968-0dc252ae0e32','59f5a562-7a5e-4326-8124-090886b9338d','976722f4-46f0-4965-991d-f2979833a801','75673d8b-f630-4f42-8d13-4cbc2d4ca5a1','692468a4-d319-4fa7-b5f0-44f3c87e5a1d','7b18124d-f4eb-456f-86e2-d593660a16cb','546c9bbe-4948-42a1-bf37-7fb22e57cf53','e9ed0ab1-dfe4-433b-b2c5-fc22b3c90a5c','f1d03a79-1d6f-4c8e-82fd-e5f33eae7732','d87bc4b2-c34e-492d-804b-e94fcca6dce6','55d60d49-0094-4c6d-9168-783cc8ec3966','5efc9ccf-055d-4208-a06b-b610d88e01b7','9adabb99-734f-4409-973e-b8a3cab30427','32e22542-559e-4edf-a832-2d063105345e','26a183bd-37b1-4c3b-b2c3-6df1a9436482','3974c45b-e857-4f61-b69c-134abbc67080','ef8227eb-5b50-4ae9-be94-4c15120d1196','b5d996bc-29bb-49e7-a47f-3727b99219f1','d3f5acba-5646-478f-b512-d90c2b6f20b0','43b355e2-f84a-4f93-99cb-bc4654987077','beeaaad1-cc58-465b-aaab-b10b7b7a099d','2bd64976-d4fa-4f67-bb66-7a637383b501','730787d4-8dfc-4f7a-881a-e4980c7d0b87','b45c70c7-a05d-4706-9c19-b908e6922ef6','9f96ab2e-9320-418a-a352-49c593109a12','60f49b50-f6e1-4178-a5ba-1710808edc96','ff76e15f-e817-4b5a-8a24-6f183467330a','34b73176-e40c-4c89-a050-645763ab0f8c','47982902-17b9-4710-a9c6-3b33a78a01d3','f8af0ffd-b0c8-4f24-aeb1-3f863dcc3b10','29c85bf8-f51a-4b9c-8b88-912255d091d6','4c4cca85-ce42-4f8f-81c3-51f226648b6d','18be8a0a-ae68-498e-ab6b-527be014d52b','1cc8cdba-4e37-4ee9-aebb-11dda01cbc66','448aa69f-1e11-40ca-88bf-a95705b038ae','7f1de582-abc0-4940-b015-2ae32866e908','db137b15-c822-4c6e-9fb2-563e53377e77','d11d77e8-e4df-495c-8fc3-084503ff3cfc','4cc47406-fb42-4a87-923f-5d7b46ebfa44','c3c4fbb4-432a-4338-8c13-5efca2ef1116','a9b0eb3b-243c-4c54-a4f8-c2f8bda052cd','c93f820b-5c9c-441a-8981-f9728918af3e','7849b9dc-807b-4bce-a4ac-98c2f574602c','9e8fd2a2-684e-4e67-9f85-870ee386de80','fa52937a-5f7c-4934-8f4c-5c76de072da5','555b359e-ddd7-4573-b759-ca1c9370b83f','89203658-169e-4f68-b42b-cb2de375e24b','339025c9-fbb0-4ef8-9f9d-7308dbc3e2ed','6b616463-c755-4255-be69-2c7b4a4435c8','9abf8afa-7ecb-4e3b-b5ce-40a0cff9f9b8','0de4f5df-1f35-462f-859c-80d9ecb55801','80f167ad-2408-47b1-9e24-1424b2205005','3e973be6-6fc7-4733-8589-dc26c19aff08','fd32b567-b28c-431c-bc04-e47d868ff7ff','59f891ad-24bd-4e23-81ae-10af60415008','b8630d71-78b1-450d-848b-b27db4f1f769','443d47d2-e861-4b04-86d3-245b7acecebb','2512e519-20ee-4691-acbd-0614cbd8982a','bfbdcc83-be61-4ad4-9a62-a48ce5bec971','dedf5bc6-f3ed-42ee-b607-5db58b31a8c5','6f9c859b-8f0a-4c24-8e31-00d032177554','fc065a94-61a9-414a-8b2c-51a02175ca8b','77edd8ca-37fa-4303-9983-f9172d1525c9','e9944b4c-f873-409d-ae16-ccf8d7a25f7e','42512d72-da4b-496c-b99b-8bef1e72987f','a02b4181-24e1-420e-abd7-a86d97352081','cf1b88e6-4090-418c-8ea0-086ce8b4a608','07a087ae-e67e-4fe3-a15e-bddbc924b09a','2e660a43-178d-4bb6-b97c-02e8586aa7b6','8a31c9a0-fe91-4e40-90ff-70b0263daa21','4420e566-fc6c-4209-b9bc-b702c35739d5','31ab47a8-3556-481d-8ff4-75d507555da4','bcf5a2d3-9c1d-4d5c-a2cc-509b0d3c2958','bb3ecc54-d566-4cb8-ace1-2263ef59aeb5','7c7d2a20-c7b6-45e1-a7e4-32122056e700','a080a4ff-e1ca-4996-8321-203ac15565f3','bf3c2296-4e19-48c3-a803-e87d8222ea9d','69f739fa-87ba-47f5-8f96-17caae0d45b5','8f99e406-348e-461d-8a05-43f38a783a07','43cfae60-caf0-4205-a2a2-502960388bf0','85490323-f2ac-4030-8edc-2273be231a76','70a1dad5-1933-4caf-901d-21863be44aec','c4e285c1-37e1-498f-a65d-73e4764dc3ab','8a284fd0-f0fc-4a92-99e8-58eb2ce4d57c','2083d204-ae87-4a1b-8027-e67f91056186','7cfecce7-cd6c-4e5d-b53e-0ec16e0ad626','4999cd3f-fe6e-4066-a8dc-dc435396f232','d95e0ec5-15a6-48e9-a37a-53fabcf56095','5caf8e73-f2d3-4513-9946-56f5f774901a','420aadef-24f9-4dd3-b894-8de0362ecbfd','59db7cf1-46ad-4364-8678-045fdf136f40','0631e285-6188-4513-9a10-c804e4f8dfb5','1d726e0d-242a-4dc6-9e7f-aaee89007596','9d724611-e505-47a7-9dea-146a781053a5','76424d86-e7a8-4e0d-9afe-5bc8d4292b98','12fcccf9-788c-4779-92c0-21127b6cbe1c','81892ab6-568a-482e-a480-68a0a4ac3cd4','fbe7fee3-82ed-42b0-a04a-8b69cddd3c3f','a5d08488-9c8f-43e7-b9c3-070afd87fe88','bb3de07a-fdce-4879-8e9e-bdf83d8a1873','b4b26fe7-3c15-494a-bc7d-a38f053c0bda','eb0a13bf-655f-433f-b062-58a162017da5','0e5f02c3-1a7e-4dd4-8ce8-f9f933070ce9','7b024305-85f2-449a-9144-8b0e84b08d47','08d6b407-7da7-4500-9170-4e4ca4835ed4','4c3d9d5e-d284-4d56-a302-77dfaafe219d','16ec0236-4776-4680-867a-b7ecaaaf2b99','7d348a87-1f49-4b70-a80d-301ef1b006e5','7501aa8e-bb45-4d3c-a0cb-b1734042b371','6dc6d225-6fda-42b6-b1db-b7badf8f9403','12b4f8ae-8ace-481d-90ce-c518b3d20b1e','5666f18d-8436-47be-8eaf-e5a8637f9afa','7a80f796-455c-4634-b89c-db80317e15e0','ff248def-1016-4f72-a5c9-f899645e61c7','6a721765-030c-48a8-a8b5-733a68773a4f','85c6f892-035d-41de-9fa5-7a65d502744e','36d4289c-a594-4090-ad77-805f9c36edfb','6561d8ec-9b8e-48a3-8cc4-22d61666b9df','7fd9882c-9e5e-4009-87de-eedfcf130ffd','1bd890a3-14d4-4b88-99fc-a12626eec5ca','6d138444-9a2f-4ecc-b31e-200ba158b3d6','b5b8530b-4fc3-41bf-8155-5e38701efabc','1e5aadd5-3d61-4d51-8bbb-56b5b3993e71','2d1d6e3d-a26d-4400-8416-bcce51c5b185','0008882d-ab96-4815-9219-39503cd5d793','65489351-9b36-4d82-b228-709da8647bae','bc9ae1e3-808c-4e12-9267-df8a4287d103','53987906-73c1-4e6a-a34e-4751eb1a111c','c1f95eea-44ea-4309-914b-ec912f7ee812','52e40997-5931-461e-b2ce-a3a2e0618a6e','1ed883aa-72da-40ea-95b9-49695abe1265','fac6db05-2090-421d-b4bd-f4eb57119ce8','20edfb74-1fc0-4c52-90cb-e33be01f85d5','4003276f-2b5a-471d-90f8-de4bd1140673','9e6f87d7-7ec8-4e9b-91fe-d572aa0b0a5b','01ace46d-106c-4f71-837f-cc5c4b9b21dc','19256b26-770e-4d5b-a38b-f612dbbf6ded','9e35283c-5b64-45b8-924d-e41cb73450cc','d6c687e3-5e7c-436b-ba5f-b04e08039860','6d1316fe-9f4d-4c88-8298-e0d5f9eab5b8','5e7a6085-0ad7-4171-8ace-6cef5441690a','fabc9b40-11a4-419b-8562-9561998d42d1','dcd4a7d3-b9c8-41c3-a6d9-54a3daf3123f','3c18628e-f2ef-4e4d-a12e-5f535ec9661b','5833dc9d-c3c4-4f3d-bf2d-48a6dc38d60d','04920d78-8f13-4f1c-9789-596eff99a29d','ec9ab69b-221b-4ae8-b0b3-6e128e9798c9','27059180-28ae-49b7-8ffe-690a118052e6','b4e02157-a7db-451d-8a74-d3c812a50b11','98d1fd08-ed02-4599-aa31-01e78fdebc60','ff3d1ee5-6868-407d-86f8-cc58581c22a9','7b309a58-8157-4bf4-a5e2-4287e23586c8','4914f9d7-3969-4192-af1e-664df081f194','7d6606ae-45ca-4a42-9fad-1d245fb2cfef','011f46e5-f9a8-4dd6-ac75-f06f901c8378','57976ef9-b12c-4939-aa22-f09c9b095b8b','117cd6a7-9482-43a8-81a7-928faa782cd5','d190b4ea-6fb3-4861-9149-c639356ceb7e','3a95e68e-757f-476d-a1af-4299f69de1ef','82ad29cd-1d0c-4f53-babd-54cfaadc31bd','8621c176-4e33-45b2-9523-bda220c8b0a5','d674528c-9de5-45e5-b66d-4c3ca3182fde','0876e0d0-f2ef-43e9-9fa8-328e0a76abd0','ccad9cac-8c4c-47f0-9929-4c62a25ff38e','eee831c9-b376-4e2e-afd8-63de33a4b45c','f868fad9-bb15-46ad-aa86-131bd550fd61','e90b83be-bcb3-48d2-b3ff-8e45d5d9beee','7decc5af-aa96-494a-b812-10c8cdd52bd4','30101cb7-97c9-49dc-b219-36e9f781220f','4f8c9bfe-559f-4b47-8a18-c34c8088f9f4','8277db93-e5ad-4804-8921-d7a858d464f7','e1a22feb-b581-4b7f-a85b-a9cd53b3ee09','f573c341-a08f-47c2-9f8f-fd47e7b87ed9','d11382fa-983a-45d7-a5d3-8ed82f81e1f0','949504ae-83a1-4a09-a6e7-fd096cf3264c','f0ce35fc-30e7-450a-ac6f-56e0149b8a8e','4296d321-acdd-418b-b362-3d1b01f61639','3874ba79-1322-4abf-9a57-bba6c189307f','922c24cd-2687-4dc1-a09f-701d117f5d7d','e451dc8e-35ea-4965-be3d-d63b71575e64','6b7f9944-d5b9-4cfb-a6a8-1282ad3ad155','43705492-107e-483e-ac5f-73c8612ac45a','f2d30643-e18d-4ce6-bc90-6881471e7a49','b6aecef0-4f80-49b3-9854-9c1610985a2b','84f3bc17-9f5d-4a90-a8e0-53661ade1611','dbc9825b-fae9-4eb8-994f-5b286c01cfa2');

COMMIT;

-- Terugdraaien kan met:
--   UPDATE klanten k SET debiteurennummer = b.debiteurennummer
--   FROM klanten_debiteurennummer_backup_20260722 b WHERE b.id = k.id;
