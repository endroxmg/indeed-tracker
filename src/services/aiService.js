import { GoogleGenerativeAI } from '@google/generative-ai';
import { addTimeEntry, updateTicket, getTicket } from './firestoreService';

const MODEL_NAME = "gemini-1.5-flash";

/**
 * AI Service to handle chatbot interactions and function calling (tool use).
 */
class AIService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.chat = null;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = key;
    this.genAI = new GoogleGenerativeAI(key);
  }

  /**
   * Initialize or reset the chat session with the system instruction and tools.
   */
  async initChat(context = {}) {
    if (!this.genAI) return;

    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `You are an AI assistant for the "Indeed Content Creation Tool" tracker. 
      Your goal is to help users manage tickets and time logs efficiently.
      
      User context: ${JSON.stringify(context.user || {})}
      Available tickets: ${JSON.stringify(context.tickets || [])}
      
      You can:
      1. Answer questions about tickets (status, assignee, priority).
      2. Help log time for tickets.
      3. Update ticket statuses.
      
      Always be professional, concise, and helpful. If you perform an action, confirm it to the user.
      If a user asks to log time, you MUST have the ticket ID (e.g. PROJ-123), hours (number), and optionally notes.
      If you don't know a ticket ID, ask the user or search from the provided list.`,
      tools: [
        {
          functionDeclarations: [
            {
              name: "addTimeLog",
              description: "Logs time spent on a specific ticket.",
              parameters: {
                type: "OBJECT",
                properties: {
                  jiraId: { type: "STRING", description: "The Jira ID of the ticket (e.g., PROJ-123)" },
                  hours: { type: "NUMBER", description: "Number of hours to log" },
                  date: { type: "STRING", description: "Date in YYYY-MM-DD format. Defaults to today if not specified." },
                  notes: { type: "STRING", description: "Optional notes for the log" }
                },
                required: ["jiraId", "hours"]
              }
            },
            {
              name: "updateTicketStatus",
              description: "Updates the status of a ticket.",
              parameters: {
                type: "OBJECT",
                properties: {
                  jiraId: { type: "STRING", description: "The Jira ID of the ticket" },
                  status: { 
                    type: "STRING", 
                    description: "New status: todo, in_production, ready_for_feedback, feedback_ready, completed" 
                  }
                },
                required: ["jiraId", "status"]
              }
            }
          ]
        }
      ]
    });

    this.chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });
  }

  /**
   * Send a message to the AI and handle potential tool calls.
   */
  async sendMessage(userInput, context = {}) {
    if (!this.chat) {
      await this.initChat(context);
    }
    if (!this.chat) throw new Error("AI Service not initialized. Missing API Key?");

    try {
      let result = await this.chat.sendMessage(userInput);
      let response = result.response;
      
      // Handle tool calls (function calling)
      const call = response.functionCalls()?.[0];
      if (call) {
        const toolResult = await this.handleToolCall(call, context);
        // Send the tool results back to the model to get a final response
        result = await this.chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: toolResult
          }
        }]);
        return result.response.text();
      }

      return response.text();
    } catch (err) {
      console.error("AI Error:", err);
      return "I'm sorry, I encountered an error processing your request. Please check my configuration.";
    }
  }

  /**
   * Router for tool execution.
   */
  async handleToolCall(call, context) {
    const { name, args } = call;
    console.log(`AI invoking tool: ${name}`, args);

    if (name === "addTimeLog") {
      try {
        const ticket = context.tickets?.find(t => t.jiraId === args.jiraId);
        if (!ticket) return { error: `Ticket ${args.jiraId} not found.` };

        await addTimeEntry({
          userId: context.user?.uid,
          userName: context.user?.name,
          ticketId: ticket.id,
          jiraId: ticket.jiraId,
          title: ticket.title,
          hours: args.hours,
          date: args.date || new Date().toISOString().split('T')[0],
          notes: args.notes || "Logged via AI Assistant",
          category: 'ticket'
        });
        return { success: true, message: `Successfully logged ${args.hours} hours to ${args.jiraId}.` };
      } catch (err) {
        return { error: err.message };
      }
    }

    if (name === "updateTicketStatus") {
      try {
        const ticket = context.tickets?.find(t => t.jiraId === args.jiraId);
        if (!ticket) return { error: `Ticket ${args.jiraId} not found.` };

        await updateTicket(ticket.id, { status: args.status });
        return { success: true, message: `Status for ${args.jiraId} updated to ${args.status}.` };
      } catch (err) {
        return { error: err.message };
      }
    }

    return { error: "Unknown tool call." };
  }
}

export const aiService = new AIService();
