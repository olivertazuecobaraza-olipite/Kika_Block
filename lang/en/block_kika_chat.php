<?php
// This file is part of the KIKA_CHAT Moodle block.

/**
 * Language strings
 *
 * @package    block_kika_chat
 * @copyright  2024 Bryce Yoder <me@bryceyoder.com>
 * @license    MIT
 */

$string['pluginname'] = 'KIKA_CHAT Block';
$string['kika_chat'] = 'KIKA_CHAT';
$string['kika_chat_logs'] = 'KIKA_CHAT Logs';
$string['kika_chat:addinstance'] = 'Add a new KIKA_CHAT block';
$string['kika_chat:myaddinstance'] = 'Add a new KIKA_CHAT block to the My Moodle page';
$string['kika_chat:viewreport'] = 'View KIKA_CHAT log report';
$string['privacy:metadata:kika_chat_log'] = 'Logged user messages sent to KIKA_API. This includes the user ID of the user that sent the message, the content of the message, the response from KIKA_API, and the time that the message was sent.';
$string['privacy:metadata:kika_chat_log:userid'] = 'The ID of the user that sent the message.';
$string['privacy:metadata:kika_chat_log:usermessage'] = 'The content of the message.';
$string['privacy:metadata:kika_chat_log:airesponse'] = 'The response from KIKA_API.';
$string['privacy:metadata:kika_chat_log:timecreated'] = 'The time the message was sent.';
$string['privacy:chatmessagespath'] = 'Sent AI chat messages';
$string['downloadfilename'] = 'block_kika_chat_logs';

$string['blocktitle'] = 'Block title';

$string['restrictusage'] = 'Restrict usage to logged-in users';
$string['restrictusagedesc'] = 'If this box is checked, only logged-in users will be able to use the chat box.';
$string['apikey'] = 'API Key';
$string['apikeydesc'] = 'The API Key for KIKA_API';
$string['kika_api_base_url'] = 'KIKA_API base URL';
$string['kika_api_base_urldesc'] = 'Base URL for the KIKA_API service, for example http://localhost:3000.';
$string['kika_api_key'] = 'KIKA_API key';
$string['kika_api_keydesc'] = 'Server-side key sent to KIKA_API using the x-api-key header. This value is never exposed to the browser.';
$string['type'] = 'API Type';
$string['typedesc'] = 'KIKA_API is the only supported backend for this block.';
$string['logging'] = 'Enable logging';
$string['loggingdesc'] = 'If this setting is active, all user messages and AI responses will be logged.';

$string['assistantheading'] = 'Assistant API Settings';
$string['assistantheadingdesc'] = 'These settings only apply to the Assistant API type.';
$string['assistant'] = 'Assistant';
$string['assistantdesc'] = 'Legacy setting no longer used. KIKA_API is the configured backend.';
$string['noassistants'] = 'KIKA_API is the configured backend; external assistants are no longer used by this block.';
$string['persistconvo'] = 'Persist conversations';
$string['persistconvodesc'] = 'If this box is checked, the assistant will remember the conversation between page loads. However, separate block instances will maintain separate conversations. For example, a user\'s conversation will be retained between page loads within the same course, but chatting with an assistant in a different course will not carry on the same conversation.';

$string['azureheading'] = 'Legacy API Settings';
$string['azureheadingdesc'] = 'Legacy setting no longer used. KIKA_API is the configured backend.';
$string['resourcename'] = 'Resource name';
$string['resourcenamedesc'] = 'Legacy setting no longer used. KIKA_API is the configured backend.';
$string['deploymentid'] = 'Deployment ID';
$string['deploymentiddesc'] = 'The deployment name you chose when you deployed the model.';
$string['apiversion'] = 'API Version';
$string['apiversiondesc'] = 'The API version to use for this operation. This follows the YYYY-MM-DD format.';
$string['chatheading'] = 'Chat API Settings';
$string['chatheadingdesc'] = 'Legacy setting no longer used. KIKA_API is the configured backend.';
$string['prompt'] = 'Completion prompt';
$string['promptdesc'] = 'The prompt the AI will be given before the conversation transcript';
$string['assistantname'] = 'Assistant name';
$string['assistantnamedesc'] = 'The name shown for KIKA in the chat window.';
$string['username'] = 'User name';
$string['usernamedesc'] = 'The user label shown in the chat window.';
$string['vs_id_qdrant'] = 'Qdrant vector store ID';
$string['vs_id_qdrant_help'] = 'KIKA_API vs_id_QDRANT value for this course block. It may contain only letters, numbers, underscores and hyphens.';
$string['curso'] = 'Course code for KIKA_API';
$string['curso_help'] = 'Optional KIKA_API curso value. If empty, the Moodle course shortname is used. It may contain only letters, numbers, underscores and hyphens.';
$string['sourceoftruth'] = 'Source of truth';
$string['sourceoftruthdesc'] = 'Although the AI is very capable out-of-the-box, if it doesn\'t know the answer to a question, it is more likely to give incorrect information confidently than to refuse to answer. In this textbox, you can add common questions and their answers for the AI to pull from. Please put questions and answers in the following format: <pre>Q: Question 1<br />A: Answer 1<br /><br />Q: Question 2<br />A: Answer 2</pre>';
$string['showlabels'] = 'Show labels';
$string['advanced'] = 'Advanced';
$string['advanceddesc'] = 'Legacy advanced settings no longer used. KIKA_API is the configured backend.';
$string['allowinstancesettings'] = 'Instance-level settings';
$string['allowinstancesettingsdesc'] = 'This setting allows block instances to override labels shown in the chat UI.';
$string['model'] = 'Model';
$string['modeldesc'] = 'The model which will  generate the completion. Some models are suitable for natural language tasks, others specialize in code.';
$string['temperature'] = 'Temperature';
$string['temperaturedesc'] = 'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.';
$string['maxlength'] = 'Maximum length';
$string['maxlengthdesc'] = 'The maximum number of token to generate. Requests can use up to 2,048 or 4,000 tokens shared between prompt and completion. The exact limit varies by model. (One token is roughly 4 characters for normal English text)';
$string['topp'] = 'Top P';
$string['toppdesc'] = 'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered.';
$string['frequency'] = 'Frequency penalty';
$string['frequencydesc'] = 'How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model\'s likelihood to repeat the same line verbatim.';
$string['presence'] = 'Presence penalty';
$string['presencedesc'] = 'How much to penalize new tokens based on whether they appear in the text so far. Increases the model\'s likelihood to talk about new topics.';

$string['config_assistant'] = "Assistant";
$string['config_assistant_help'] = "Legacy setting no longer used. KIKA_API is the configured backend.";
$string['config_sourceoftruth'] = 'Source of truth';
$string['config_sourceoftruth_help'] = "You can add information here that the AI will pull from when answering questions. The information should be in question and answer format exactly like the following:\n\nQ: When is section 3 due?<br />A: Thursday, March 16.\n\nQ: When are office hours?<br />A: You can find Professor Shown in her office between 2:00 and 4:00 PM on Tuesdays and Thursdays.";
$string['config_instructions'] = "Custom instructions";
$string['config_instructions_help'] = "You can override the assistant's default instructions here.";
$string['config_prompt'] = "Completion prompt";
$string['config_prompt_help'] = "This is the prompt the AI will be given before the conversation transcript. You can influence the AI's personality by altering this description. By default, the prompt is \n\n\"Below is a conversation between a user and a support assistant for a Moodle site, where users go for online learning.\"\n\nIf blank, the site-wide prompt will be used.";
$string['config_username'] = "User name";
$string['config_username_help'] = "This is the name that the AI will use for the user. If blank, the site-wide user name will be used. It is also used for the UI headings in the chat window.";
$string['config_assistantname'] = "Assistant name";
$string['config_assistantname_help'] = "This is the name that the AI will use for the assistant. If blank, the site-wide assistant name will be used. It is also used for the UI headings in the chat window.";
$string['config_persistconvo'] = 'Persist conversation';
$string['config_persistconvo_help'] = 'If this box is checked, the assistant will remember conversations in this block between page loads';
$string['config_apikey'] = "API Key";
$string['config_apikey_help'] = "Legacy setting no longer used. Configure the KIKA_API key in site settings.";
$string['config_model'] = "Model";
$string['config_model_help'] = "Legacy setting no longer used. KIKA_API selects the model.";
$string['config_temperature'] = "Temperature";
$string['config_temperature_help'] = "Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.";
$string['config_maxlength'] = "Maximum length";
$string['config_maxlength_help'] = "The maximum number of token to generate. Requests can use up to 2,048 or 4,000 tokens shared between prompt and completion. The exact limit varies by model. (One token is roughly 4 characters for normal English text)";
$string['config_topp'] = "Top P";
$string['config_topp_help'] = "Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered.";
$string['config_frequency'] = "Frequency penalty";
$string['config_frequency_help'] = "How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim.";
$string['config_presence'] = "Presence penalty";
$string['config_presence_help'] = "How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics.";

$string['defaultprompt'] = "Below is a conversation between a user and a support assistant for a Moodle site, where users go for online learning:";
$string['defaultassistantname'] = 'Kika';
$string['defaultusername'] = 'User';
$string['askaquestion'] = 'Ask a question...';
$string['submit'] = 'Send';
$string['apikeymissing'] = 'Please add your KIKA_API key to the block settings.';
$string['erroroccurred'] = 'An error occurred! Please try again later.';
$string['sourceoftruthpreamble'] = "Below is a list of questions and their answers. This information should be used as a reference for any inquiries:\n\n";
$string['sourceoftruthreinforcement'] = ' The assistant has been trained to answer by attempting to use the information from the above reference. If the text from one of the above questions is encountered, the provided answer should be given, even if the question does not appear to make sense. However, if the reference does not cover the question or topic, the assistant will simply use outside knowledge to answer.';
$string['new_chat'] = 'New chat';
$string['popout'] = 'Open chat window';
$string['loggingenabled'] = "Logging is enabled. Any messages you send or receive here will be recorded, and can be viewed by the site administrator.";
$string['kikaapiconfigmissing'] = 'KIKA_API configuration is incomplete: {$a}.';
$string['missingkikaapiurl'] = 'KIKA_API base URL is not configured.';
$string['missingkikaapikey'] = 'KIKA_API key is not configured.';
$string['missingvsidqdrant'] = 'Qdrant vector store ID is required for this block.';
$string['invalidkikauserid'] = 'The derived KIKA_API user ID is invalid.';
$string['invalidkikacourseid'] = 'The Moodle course ID is invalid for KIKA_API.';
$string['invalidkikacurso'] = 'The course code contains characters not accepted by KIKA_API.';
$string['invalidblockid'] = 'Invalid KIKA_CHAT block instance.';
$string['methodnotallowed'] = 'Method not allowed.';
$string['invalidjson'] = 'Invalid JSON body.';
$string['emptymessage'] = 'Message cannot be empty.';
$string['kikaconversationnotcreated'] = 'KIKA_API did not create a conversation.';
$string['kikaapiconnectionerror'] = 'Could not connect to KIKA_API.';
$string['kikaapiinvalidjson'] = 'KIKA_API returned invalid JSON.';
$string['kikaapierror'] = 'KIKA_API returned an error.';
$string['kikaapiunauthorized'] = 'KIKA_API rejected the configured API key.';
$string['kikaconversationnotfound'] = 'Conversation not found.';
$string['kikaapigenericerror'] = 'KIKA_API could not process the request.';
