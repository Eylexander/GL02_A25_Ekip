const giftParserModule = require('../giftParser');

describe("Program Semantic testing of Gift Parser", function () {

	beforeAll(function () {
		const testFilePath = './data/U1-p7-Adverbs.gift';
		this.questions = giftParserModule.parseGiftFile(testFilePath);
	});

	it("should correctly identify ShortAnswer questions", function () {
		expect(this.questions.length).toBeGreaterThan(0);
		
		expect(this.questions[0].type).toBe('ShortAnswer');
	});

	it("should correctly parse the question title and text", function () {
		const firstQuestion = this.questions[0];
		expect(firstQuestion.title).toBe('U1 p7 Adverbs GR 1.1');
		
		expect(firstQuestion.questionText).toContain('Does she come by car?');
		expect(firstQuestion.questionText).toContain('(generally)');
	});

	it("should correctly extract answers for ShortAnswer questions", function () {
		const firstQuestion = this.questions[0];
		expect(firstQuestion.answers).toBeDefined();
		expect(firstQuestion.answers.length).toBeGreaterThan(0);
		
		const correctAnswer = firstQuestion.answers.find(a => a.text === 'Does she generally come by car?');
		expect(correctAnswer).toBeDefined();
		expect(correctAnswer.correct).toBe(true);
	});

});