const { createApp, ref, computed, onMounted, onUpdated } = Vue;

createApp({
    setup() {
        const menuItems = ref([]);
        const dietaryText = ref("100% Purely Veg");
        const showPaymentModal = ref(false);

        // Variables to track and filter categories
        const selectedCategory = ref("All");

        const extraAddons = ref([
            { id: 101, name: "Plain Candle", price: 20 },
            { id: 102, name: "Number Candle", price: 40 },
            { id: 103, name: "Golden Number Candle", price: 60 },
            { id: 104, name: "Anniversary Tag", price: 50 },
            { id: 105, name: "Birthday Tag", price: 50 },
            { id: 106, name: "Custom Name Tag", price: 80 },
            { id: 107, name: "Premium Gift Packing", price: 120 }
        ]);

        const isCartOpen = ref(false);
        const isCheckingOut = ref(false);
        const cart = ref([]);
        const whatsappDescription = ref("");

        const customCake = ref({
            flavor: null,
            weight: 1.0,
            addons: [],
            message: ""
        });

        const checkoutDetails = ref({
            name: "",
            phone: "",
            address: "",
            payMethod: "UPI",
            upiId: "vishakha.choudhary07@okicici"
        });

        const loadDatabase = () => {
            const data = window.bakeryDatabase;
            if (data && data.menu_items) {
                menuItems.value = data.menu_items.map(item => ({
                    id: item.id,
                    name: `${item.name} (${item.purely_veg ? 'Pure Veg 🌱' : ''})`,
                    price: item.price_per_pound,
                    desc: item.description,
                    image: item.image,
                    category: item.category || "General"
                }));
                
                if (data.bakery_meta && data.bakery_meta.dietary_standard) {
                    dietaryText.value = data.bakery_meta.dietary_standard;
                }
                
                if (menuItems.value.length > 0) {
                    customCake.value.flavor = menuItems.value[0];
                }
            }
        };

        const uniqueCategories = computed(() => {
            const categories = menuItems.value.map(item => item.category);
            const unique = new Set(categories);
            return ["All", ...Array.from(unique)];
        });

        const filteredMenuItems = computed(() => {
            if (selectedCategory.value === "All") {
                return menuItems.value;
            }
            return menuItems.value.filter(item => item.category === selectedCategory.value);
        });

        const calculatedCustomPrice = computed(() => {
            if (!customCake.value.flavor) return 0;
            let basePrice = customCake.value.flavor.price * customCake.value.weight;
            
            customCake.value.addons.forEach(addon => {
                if (addon === 'Choco Chips') basePrice += 50;
                if (addon === 'Honey Drizzle') basePrice += 30;
                if (addon === 'Fresh Fruits') basePrice += 100;
            });
            
            return Math.round(basePrice);
        });

        const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0));
        const cartTotal = computed(() => cart.value.reduce((total, item) => total + item.totalPrice, 0));

        // GENERATES DYNAMIC UPI INTENT DEEP LINK FOR MOBILE APPS
        const upiDeepLink = computed(() => {
            const payeeVpa = encodeURIComponent(checkoutDetails.value.upiId);
            const payeeName = encodeURIComponent("Bee Cake");
            const amount = cartTotal.value;
            const currency = "INR";
            const transactionNote = encodeURIComponent(`Cake Order for ${checkoutDetails.value.name || 'Customer'}`);

            return `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amount}&cu=${currency}&tn=${transactionNote}`;
        });

        const addToCart = (item) => {
            const existingIndex = cart.value.findIndex(c => c.id === item.id && !c.isCustom);
            if (existingIndex > -1) {
                cart.value[existingIndex].quantity += 1;
                cart.value[existingIndex].totalPrice = cart.value[existingIndex].quantity * item.price;
            } else {
                cart.value.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    totalPrice: item.price,
                    isCustom: false
                });
            }
            isCartOpen.value = true;
        };

        const addExtraToCart = (extra) => {
            const existingIndex = cart.value.findIndex(c => c.id === extra.id);
            if (existingIndex > -1) {
                cart.value[existingIndex].quantity += 1;
                cart.value[existingIndex].totalPrice = cart.value[existingIndex].quantity * extra.price;
            } else {
                cart.value.push({
                    id: extra.id,
                    name: extra.name,
                    price: extra.price,
                    quantity: 1,
                    totalPrice: extra.price,
                    isCustom: false
                });
            }
        };

        const addCustomCakeToCart = () => {
            if (!customCake.value.flavor) return;
            const calculatedPrice = calculatedCustomPrice.value;
            const cakeName = `Custom ${customCake.value.flavor.name}`;
            
            cart.value.push({
                id: Date.now(),
                name: cakeName,
                price: calculatedPrice,
                quantity: 1,
                totalPrice: calculatedPrice,
                isCustom: true,
                weight: customCake.value.weight,
                message: customCake.value.message,
                addons: [...customCake.value.addons]
            });

            customCake.value.weight = 1.0;
            customCake.value.addons = [];
            customCake.value.message = "";
            isCartOpen.value = true;
        };

        const openPaymentModal = () => {
            if (!checkoutDetails.value.name.trim() || !checkoutDetails.value.phone.trim() || !checkoutDetails.value.address.trim()) {
                alert("Please fill out all delivery details fields completely before proceeding to payment!");
                return;
            }
            showPaymentModal.value = true;
        };

        // Sends the WhatsApp message WITHOUT closing the modal or clearing the cart
        const confirmPaidOrder = () => {
            let orderSummary = `✨ *NEW ORDER RECEIVED - BEE CAKE* ✨\n\n`;
            orderSummary += `👤 *Customer Name:* ${checkoutDetails.value.name}\n`;
            orderSummary += `📞 *Mobile Number:* ${checkoutDetails.value.phone}\n`;
            orderSummary += `📍 *Delivery Address:* ${checkoutDetails.value.address}\n`;
            orderSummary += `💳 *Payment Type:* UPI Secure Transfer Verified\n\n`;
            orderSummary += `🎂 *Order Basket Details:* \n`;

            cart.value.forEach(item => {
                orderSummary += `• ${item.name} (x${item.quantity}) - ₹${item.totalPrice}\n`;
                if (item.isCustom) {
                    orderSummary += `  └ Size: ${item.weight}lb | Note: "${item.message || 'None'}"\n`;
                }
            });

            orderSummary += `\n💰 *Total Amount Paid: ₹${cartTotal.value}*\n\n`;
            orderSummary += `📌 *Note:* Please send the screenshot of your payment inside this chat window to verify your transaction!`;

            const targetPhone = "7752891455";
            window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(orderSummary)}`, '_blank');
            
            // Modal and cart remain open intentionally so the user can re-send if needed
        };

        // ONLY clears cart and closes modal when the user explicitly clicks the Cross/Cut button
        const closePaymentModal = () => {
            showPaymentModal.value = false;
            cart.value = [];
            isCheckingOut.value = false;
            isCartOpen.value = false;
        };

        const sendWhatsAppRequest = () => {
            if (!whatsappDescription.value.trim()) {
                alert("Please type out a description of your custom cake before sending.");
                return;
            }
            const targetPhone = "7752891455";
            const greetingText = `Hello Vishakha! I would like to place a custom cake order request at Bee Cake.\n\n*Description Details*:\n${whatsappDescription.value}`;
            window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(greetingText)}`, '_blank');
        };

        const removeFromCart = (index) => {
            cart.value.splice(index, 1);
            if (cart.value.length === 0) {
                isCheckingOut.value = false;
            }
        };

        onMounted(() => {
            loadDatabase();
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });

        onUpdated(() => {
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });

        return {
            menuItems,
            dietaryText,
            extraAddons,
            isCartOpen,
            isCheckingOut,
            cart,
            customCake,
            checkoutDetails,
            whatsappDescription,
            calculatedCustomPrice,
            cartCount,
            cartTotal,
            showPaymentModal,
            upiDeepLink,
            addToCart,
            addExtraToCart,
            addCustomCakeToCart,
            openPaymentModal,
            confirmPaidOrder,
            closePaymentModal,
            sendWhatsAppRequest,
            removeFromCart,
            selectedCategory,
            uniqueCategories,
            filteredMenuItems
        };
    }
}).mount('#app');
