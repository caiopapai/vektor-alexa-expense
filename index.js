const Alexa = require('ask-sdk-core');
const { v4: uuidv4 } = require('uuid');
const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();
const table = process.env.VEKTOR_EXPENSE_TABLE;

let speakOutput = ''

const welcomeSpeak = 'Olá, eu sou o véktor vou te ajudar com suas despesas. ' + 'Em que posso ajudar?';     

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


        speakOutput = "Certo, diga qual o tipo e subtipo da despesa, por exemplo, saúde,  plano de saúde."                  
        
        if(attributes.uuid == undefined){
            attributes.expense_uuid = uuidv4(),
            attributes.event = "CreateExprense";
            attributes.event_date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        }

        attributes.interaction = 1;

        handlerInput.attributesManager.setSessionAttributes(attributes);

        console.log(handlerInput.attributesManager.getSessionAttributes());

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(endSession)    
            .getResponse();
    }
};

const TypeAndSubtypeIntentHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TypeAndSubtypeIntent';
    },

    handle(handlerInput) {

        const attributes = handlerInput.attributesManager.getSessionAttributes();

        attributes.type = Alexa.getSlotValue(handlerInput.requestEnvelope, 'expense_type');
        attributes.subtype = Alexa.getSlotValue(handlerInput.requestEnvelope, 'expense_subtype');

        handlerInput.attributesManager.setSessionAttributes(attributes);

        speakOutput = "Esta despesa é essencial?"

        return handlerInput.responseBuilder
            .withShouldEndSession(false)  
            .speak(speakOutput)
            .getResponse();
    }
}

const EssentialIntentHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EssentialIntent';
    },

    handle(handlerInput) {

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.essential_expense = Alexa.getSlotValue(handlerInput.requestEnvelope, 'essential_expense');

        handlerInput.attributesManager.setSessionAttributes(attributes);

        speakOutput = `Esta despesa é recorrente? Se sim, me diga a periodicidade. 
        Por exemplo, mensal, semanal ou diária e a data de termino da recorrência caso tenha,`
    
        return handlerInput.responseBuilder
            .withShouldEndSession(false)  
            .speak(speakOutput)
            .getResponse();
    }
}

const RecurrenceIntentHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RecurrenceIntent';
    },

    handle(handlerInput) {

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        var is_recurrent = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrent');
        var recurrence_type = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_type');
        var recurrence_due_day = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_due_day');
        var recurrence_end_date = Alexa.getSlotValue(handlerInput.requestEnvelope, 'recurrence_end_date');
        var recurrent = true;

        if(is_recurrent == 'Sim'){

            var recurrence = {
                type : recurrence_type,
                due_day : recurrence_due_day,
                end_date : recurrence_end_date
            }
        }else{
            recurrent = false;
        }

        attributes.recurrent = recurrent;
        attributes.recurrence = recurrence;

        handlerInput.attributesManager.setSessionAttributes(attributes);

        speakOutput = `Diga o valor em reais e centavos da despesa, 
        por exemplo, dez reais e vinte centavos.`
    
        return handlerInput.responseBuilder
            .withShouldEndSession(false)  
            .speak(speakOutput)
            .getResponse();
    }
}

const AddExpenseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddExpenseIntent';
    },

    handle(handlerInput) {

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const type = attributes.expense_type;
        const subtype = attributes.expense_subtype;
        const essential_expense = attributes.essential_expense;
        const recurrent = attributes.recurrent;
        const recurrence = attributes.recurrence;
        
        const vektor_value = Alexa.getSlotValue(handlerInput.requestEnvelope, 'value');
        const vektor_value_decimal = Alexa.getSlotValue(handlerInput.requestEnvelope, 'value_decimal');

        var value = '';
        if (vektor_value == undefined) {
            value = '00';
        }else{
            value = value;
        }

        if (vektor_value_decimal == undefined) {
            value = value + '.00';
        } else {
            value = value + '.' + vektor_value_decimal;
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
        TypeAndSubtypeIntentHandler,
        EssentialIntentHandler,
        RecurrenceIntentHandler,
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