const Alexa = require('ask-sdk-core');
const { v4: uuidv4 } = require('uuid');
const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

let speakOutput = ''

const welcomeSpeak = 'Olá, eu sou o véktor gerenciador de despesas, sou responsável por gerenciar as suas despesas. ' +
'Em que posso te ajudar?';     

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        speakOutput = welcomeSpeak;    

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.uuid = uuidv4();
        attributes.date = new Date();

        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CreateExpenseItentHanlder = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateExpenseItent';
    },

    handle(handlerInput) {

        const attributes = handlerInput.attributesManager.getSessionAttributes();

        let speakOutput = '';
        let endSession = false;


        speakOutput = `Certo, diga qual o tipo e subtipo da despesa, por exempo, saúde  plano de saúde, 
                        se esta despesa é essencial, se a despesa é recorrente, se for, me diga a periodicidade, exemplo, 
                        mensal, semanal ou diária, a data de termino, caso tenha, e o valor da despesa com os centavos`;                   
        
        if(attributes.uuid == undefined){
            attributes.expense_uuid = uuidv4(),
            attributes.event = "CreateExprense";
            attributes.event_date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        }

        attributes.interaction = "001";

        handlerInput.attributesManager.setSessionAttributes(attributes);

        console.log(handlerInput.attributesManager.getSessionAttributes());

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(endSession)    
            .getResponse();
    }
};

const AddExpenseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddExpenseIntent';
    },

    handle(handlerInput) {

        const table = process.env.VEKTOR_EXPENSE_TABLE;


        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const type = Alexa.getSlotValue(handlerInput.requestEnvelope, 'expense_type');
        const subtype = Alexa.getSlotValue(handlerInput.requestEnvelope, 'expense_subtype');
        const essential_expense = Alexa.getSlotValue(handlerInput.requestEnvelope, 'essential_expense');
        const recurrent = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrent');
        const recurrence_type = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_type');
        const recurrence_due_day = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_due_day');
        const recurrence_end_date = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_end_date');
        const value = Alexa.getSlotValue(handlerInput.requestEnvelope, 'value');

        if(recurrent == 'Sim'){
            var recurrence = {
                type : recurrence_type,
                due_day : recurrence_due_day,
                end_date : recurrence_end_date
            }
        }

        const expenseEvent = {
            expense_uuid: attributes.expense_uuid,
            event : attributes.event,
            event_date: attributes.event_date,
            event_payload : {
                type,
                subtype,
                essential_expense,
                recurrent,
                recurrence
            },
            value
        };

        var params = {
            TableName:table,
                Item:expenseEvent
        }
                
        console.log("Adding a new expense...");

        dynamo.put(params, (err, data) => {
            if (err) {
                console.error("Unable to add expense. Error JSON:", JSON.stringify(err, null, 2));
                speakOutput = 'Estou com dificuldades para criar sua despesa.';
            }else{
                console.log("Added item:", JSON.stringify(data, null, 2));
                speakOutput = 'Sua despesa foi criada.';
            }
        });
    
        return handlerInput.responseBuilder
            .withShouldEndSession(true)  
            .speak(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'OK! Compra finalizada. Obrigada';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CreateExpenseItentHanlder,
        AddExpenseIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();